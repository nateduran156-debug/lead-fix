'use strict';

const {
  getRaidPoints, modifyRaidPoints, setRaidPoints,
  getRaidLeaderboard, getRaidSeason, updateRaidSeason,
  modifyRankPoints,
} = require('../utils/database');
const { applyRankRoles }      = require('../utils/rankroles');
const { applyRaidRankRoles }  = require('../utils/raidRankSync');
const { ok, err, card, COLORS } = require('../utils/components');
const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags,
} = require('discord.js');

const category   = 'raidpoints';
const prefixName = 'raidpoints';
const aliases    = ['raidp', 'rp'];

async function prefixExecute(message, args) {
  const guildId = message.guild.id;
  const isMod   = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
  const season  = getRaidSeason(guildId);
  const sub     = args[0]?.toLowerCase();

  // ── .raidpoints check [@user] ─────────────────────────────────────────────
  if (!sub || sub === 'check') {
    const user = message.mentions.users.first() || message.author;
    const data = getRaidPoints(user.id, guildId, season);
    return message.reply(card({
      title: `${user.username}'s Raid Points`,
      desc:  `**Points** ${data?.points ?? 0}\n**Season** ${season}`,
      color: COLORS.black,
    }));
  }

  // ── .raidpoints top ───────────────────────────────────────────────────────
  if (sub === 'top' || sub === 'lb' || sub === 'leaderboard') {
    const lb = getRaidLeaderboard(guildId, season);
    if (!lb.length) return message.reply(card({ title: 'Raid Leaderboard', desc: 'No data for this season.', color: COLORS.black }));
    return message.reply(card({
      title:  `Raid Leaderboard — ${season}`,
      desc:   lb.map((e, i) => `**#${i + 1}** <@${e.user_id}> — **${e.points}** pts`).join('\n'),
      color:  COLORS.black,
    }));
  }

  // ── .raidpoints panel [#channel] ─────────────────────────────────────────
  if (sub === 'panel') {
    const ch = message.mentions.channels.first() || message.channel;
    const lb = getRaidLeaderboard(guildId, season);
    const list = lb.length
      ? lb.map((e, i) => `**#${i + 1}** <@${e.user_id}> — **${e.points}** pts`).join('\n')
      : 'No raid points recorded this season.';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const container = new ContainerBuilder()
      .setAccentColor(0x000000)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Raid Leaderboard — ${season}`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(list))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# updated ${dateStr}`));
    await ch.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    return message.reply(ok(`Raid leaderboard panel sent to ${ch}.`));
  }

  // ── .raidpoints season [number] ───────────────────────────────────────────
  if (sub === 'season') {
    const num = parseInt(args[1]);
    if (num) {
      if (!isMod) return message.reply(err('You need the **Manage Server** permission to change the season.'));
      updateRaidSeason(guildId, num);
      return message.reply(ok(`Season set to **Season ${num}**.`));
    }
    return message.reply(card({ title: 'Raid Season', desc: `Current season: **${season}**`, color: COLORS.black }));
  }

  if (!isMod) return message.reply(err('You need the **Manage Server** permission to modify raid points.'));

  const user   = message.mentions.users.first();
  const amount = parseInt(args[2]);

  // ── .raidpoints add @user <amount> ───────────────────────────────────────
  if (sub === 'add') {
    if (!user || isNaN(amount)) return message.reply(err('Usage: `.raidpoints add @user <amount>`'));
    const res    = modifyRaidPoints(user.id, guildId, season, amount);
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRaidRankRoles(message.guild, member, res.points).catch(() => {});
    return message.reply(ok(`Added **${amount}** raid points to ${user}. Total: **${res.points}**.`));
  }

  // ── .raidpoints remove @user <amount> ────────────────────────────────────
  if (sub === 'remove') {
    if (!user || isNaN(amount)) return message.reply(err('Usage: `.raidpoints remove @user <amount>`'));
    const res    = modifyRaidPoints(user.id, guildId, season, -amount);
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRaidRankRoles(message.guild, member, res.points).catch(() => {});
    return message.reply(ok(`Removed **${amount}** raid points from ${user}. Total: **${res.points}**.`));
  }

  // ── .raidpoints reset @user ───────────────────────────────────────────────
  if (sub === 'reset') {
    if (!user) return message.reply(err('Mention a user.'));
    setRaidPoints(user.id, guildId, season, 0);
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) applyRaidRankRoles(message.guild, member, 0).catch(() => {});
    return message.reply(ok(`Reset ${user}'s raid points for **${season}**.`));
  }

  // ── .raidpoints transfer @user [multiplier] ───────────────────────────────
  if (sub === 'transfer') {
    if (!user) return message.reply(err('Mention a user.'));
    const multi    = parseInt(args[2]) || 1;
    const raidData = getRaidPoints(user.id, guildId, season);
    const raidPts  = raidData?.points ?? 0;
    const rankPts  = raidPts * multi;
    const res      = modifyRankPoints(user.id, guildId, rankPts);
    setRaidPoints(user.id, guildId, season, 0);
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      applyRankRoles(message.guild, member, res.points).catch(() => {});
      applyRaidRankRoles(message.guild, member, 0).catch(() => {});
    }
    return message.reply(ok(
      `Transferred **${rankPts}** rank points to ${user} (${raidPts} raid pts × ${multi}).\nRaid points have been reset.`
    ));
  }

  return message.reply(card({
    title: 'Raid Points — Usage',
    desc: [
      '`.raidpoints check [@user]` — check raid points',
      '`.raidpoints top` — leaderboard',
      '`.raidpoints panel [#channel]` — send leaderboard panel',
      '`.raidpoints season [number]` — view or change the season',
      '`.raidpoints add @user <amount>` — add raid points',
      '`.raidpoints remove @user <amount>` — remove raid points',
      '`.raidpoints reset @user` — reset a user\'s points',
      '`.raidpoints transfer @user [multiplier]` — convert to rank points',
      '`.setrank <role_id> <points>` — set auto-promo thresholds',
    ].join('\n'),
    color: COLORS.black,
  }));
}

const { SlashCommandBuilder } = require('discord.js');

const slashData = new SlashCommandBuilder()
  .setName('raidpoints')
  .setDescription('manage raid points for members')
  .addSubcommand(s => s
    .setName('add')
    .setDescription('add raid points to a member')
    .addUserOption(o => o.setName('user').setDescription('member').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('points to add').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s
    .setName('remove')
    .setDescription('remove raid points from a member')
    .addUserOption(o => o.setName('user').setDescription('member').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('points to remove').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s
    .setName('check')
    .setDescription('check a member\'s raid points')
    .addUserOption(o => o.setName('user').setDescription('member').setRequired(true)))
  .addSubcommand(s => s.setName('top').setDescription('view the raid points leaderboard'))
  .addSubcommand(s => s
    .setName('reset')
    .setDescription('reset a member\'s raid points')
    .addUserOption(o => o.setName('user').setDescription('member').setRequired(true)))
  .addSubcommand(s => s
    .setName('transfer')
    .setDescription('transfer raid points to rank points')
    .addUserOption(o => o.setName('user').setDescription('member').setRequired(true))
    .addIntegerOption(o => o.setName('multiplier').setDescription('multiplier (default 1)').setMinValue(1)))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(interaction) {
  const sub     = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const season  = getRaidSeason(guildId) || 1;

  if (sub === 'add') {
    const user   = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    modifyRaidPoints(user.id, guildId, season, amount);
    const { points } = getRaidPoints(user.id, guildId, season) || { points: amount };
    return interaction.reply(ok(`Added **${amount}** raid points to ${user}. Total: **${points}**.`));
  }
  if (sub === 'remove') {
    const user   = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    modifyRaidPoints(user.id, guildId, season, -amount);
    const row = getRaidPoints(user.id, guildId, season);
    return interaction.reply(ok(`Removed **${amount}** raid points from ${user}. Total: **${row?.points ?? 0}**.`));
  }
  if (sub === 'check') {
    const user = interaction.options.getUser('user');
    const row  = getRaidPoints(user.id, guildId, season);
    return interaction.reply(card({ title: `Raid Points — ${user.username}`, desc: `**${row?.points ?? 0}** points (Season ${season})`, color: COLORS.red }));
  }
  if (sub === 'top') {
    const lb = getRaidLeaderboard(guildId, season).slice(0, 10);
    if (!lb.length) return interaction.reply(err('No raid points logged yet.'));
    const list = lb.map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${r.points}** pts`).join('\n');
    return interaction.reply(card({ title: `Raid Leaderboard — Season ${season}`, desc: list, color: COLORS.red }));
  }
  if (sub === 'reset') {
    const user = interaction.options.getUser('user');
    setRaidPoints(user.id, guildId, season, 0);
    return interaction.reply(ok(`Reset raid points for ${user}.`));
  }
  if (sub === 'transfer') {
    const user       = interaction.options.getUser('user');
    const multiplier = interaction.options.getInteger('multiplier') || 1;
    const row        = getRaidPoints(user.id, guildId, season);
    const pts        = row?.points ?? 0;
    const rank       = Math.floor(pts * multiplier);
    modifyRankPoints(user.id, guildId, rank);
    setRaidPoints(user.id, guildId, season, 0);
    await applyRankRoles(interaction.guild, user.id);
    return interaction.reply(ok(`Transferred **${pts}** raid pts × ${multiplier} = **${rank}** rank pts for ${user}.`));
  }
}

module.exports = { data: slashData, execute, prefixName, aliases, category, prefixExecute };
