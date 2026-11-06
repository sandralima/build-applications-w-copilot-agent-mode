import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Activity payload must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    typeof teamId !== 'string' ||
    !mongoose.isValidObjectId(userId) ||
    !mongoose.isValidObjectId(teamId) ||
    typeof type !== 'string' ||
    type.length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw Object.assign(new Error('Invalid activity payload'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity references an unknown user or team'), { status: 400 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Team payload must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    typeof mascot !== 'string' ||
    mascot.length === 0 ||
    !Array.isArray(members) ||
    members.some((member) => typeof member !== 'string' || !mongoose.isValidObjectId(member))
  ) {
    throw Object.assign(new Error('Invalid team payload'), { status: 400 });
  }

  const memberIds = members as string[];
  const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
  if (memberCount !== new Set(memberIds).size) {
    throw Object.assign(new Error('Team references an unknown member'), { status: 400 });
  }

  const team = await Team.create({ name, mascot, members: memberIds });
  if (memberIds.length > 0) {
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const entries = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1 } },
  ]);
  const teams = await Team.find({ _id: { $in: entries.map(({ _id }) => _id) } }).lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return entries.map((entry, index) => ({
    rank: index + 1,
    teamName: teamNames.get(entry._id.toString()),
    totalPoints: entry.totalPoints,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const latestActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const focus = user.fitnessGoal || latestActivity?.type;
  const workouts = await Workout.find(focus ? { focus } : {}).lean();

  return workouts.map((workout) => ({
    ...workout,
    reason: latestActivity
      ? `Matches your ${latestActivity.type} activity and ${focus} goal`
      : `Matches your ${focus} goal`,
  }));
}

export { User };
