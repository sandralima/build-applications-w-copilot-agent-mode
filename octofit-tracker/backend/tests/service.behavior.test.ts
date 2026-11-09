import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createTeam, suggestWorkouts } from '../src/services/octofitService.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

describe('OctoFit service behavior', () => {
  it('removes reassigned members from their previous teams', async () => {
    const previousTeam = await Team.create({ name: 'Previous', mascot: 'Old', members: [] });
    const user = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: previousTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: previousTeam._id }, { $addToSet: { members: user._id } });

    const nextTeam = await createTeam({
      name: 'Next',
      mascot: 'New',
      members: [user._id.toString()],
    });

    const updatedUser = await User.findById(user._id).lean();
    const updatedPreviousTeam = await Team.findById(previousTeam._id).lean();
    expect(updatedUser?.team?.toString()).toBe(nextTeam._id.toString());
    expect(updatedPreviousTeam?.members.map(String)).not.toContain(user._id.toString());
    expect(nextTeam.members.map(String)).toContain(user._id.toString());
  });

  it('suggests workouts matching either the latest activity or fitness goal', async () => {
    const team = await Team.create({ name: 'Octocats', mascot: 'Mona', members: [] });
    const user = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: team._id,
      fitnessGoal: 'endurance',
    });
    await Activity.create({
      user: user._id,
      team: team._id,
      type: 'run',
      minutes: 40,
      points: 40,
      occurredAt: new Date(),
    });
    await Workout.create([
      { title: 'Intervals', focus: 'endurance', minutes: 30, difficulty: 'moderate' },
      { title: 'Running Drills', focus: 'run', minutes: 20, difficulty: 'easy' },
      { title: 'Strength Circuit', focus: 'strength', minutes: 30, difficulty: 'moderate' },
    ]);

    const suggestions = await suggestWorkouts(user.email);

    expect(suggestions.map(({ title }) => title).sort()).toEqual(['Intervals', 'Running Drills']);
    expect(suggestions.find(({ title }) => title === 'Intervals')?.reason).toMatch(/endurance goal/);
    expect(suggestions.find(({ title }) => title === 'Running Drills')?.reason).toMatch(/run activity/);
  });
});
