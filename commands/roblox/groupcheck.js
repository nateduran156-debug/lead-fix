'use strict';

const { card, err, COLORS }          = require('../../utils/components');
const { getUserByUsername, getUserRankInGroup } = require('../../utils/roblox');
const { getVerifiedUser }             = require('../../utils/database');

const category   = 'roblox';
const prefixName = 'groupcheck';
const aliases    = ['gc', 'grouprank'];

async function prefixExecute(message, args) {
  const groupId = args[0];
  const input   = args[1];

  if (!groupId) return message.reply(err('Usage: `.groupcheck <group_id> [username|@member]`'));

  await message.channel.sendTyping().catch(() => {});

  let robloxId;
  let displayName;

  const mentionedMember = message.mentions.members.first();
  if (mentionedMember) {
    const linked = getVerifiedUser(message.guild.id, mentionedMember.id);
    if (!linked) return message.reply(err(`${mentionedMember.user.username} has no linked Roblox account.`));
    robloxId    = linked.roblox_id;
    displayName = linked.roblox_name;
  } else if (input) {
    let user;
    try {
      user = /^\d+$/.test(input) ? { id: input, name: input } : await getUserByUsername(input);
    } catch {
      return message.reply(err('Failed to reach the Roblox API.'));
    }
    if (!user) return message.reply(err(`No Roblox account found for **${input}**.`));
    robloxId    = user.id;
    displayName = user.name || input;
  } else {
    const linked = getVerifiedUser(message.guild.id, message.author.id);
    if (!linked) return message.reply(err('You have no linked Roblox account. Use `.verify <username>` first.'));
    robloxId    = linked.roblox_id;
    displayName = linked.roblox_name;
  }

  let rankData;
  try {
    rankData = await getUserRankInGroup(robloxId, groupId);
  } catch {
    return message.reply(err('Failed to retrieve group rank data.'));
  }

  if (!rankData) {
    return message.reply(card({
      title: `${displayName} — Group Check`,
      desc:  `**${displayName}** is not a member of group \`${groupId}\`.`,
      color: COLORS.red,
    }));
  }

  return message.reply(card({
    title:  `${displayName} — ${rankData.group?.name}`,
    desc:   `**Rank** ${rankData.role?.name} (Rank ${rankData.role?.rank})`,
    color:  COLORS.green,
    footer: `Group ID: ${groupId}`,
  }));
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('groupcheck')
  .setDescription('check a user\'s rank in a Roblox group')
  .addStringOption(o => o.setName('groupid').setDescription('Roblox group ID').setRequired(true))
  .addStringOption(o => o.setName('user').setDescription('Roblox username or ID (default: your linked account)'));

async function execute(interaction) {
  const groupId = interaction.options.getString('groupid');
  const input   = interaction.options.getString('user');
  await interaction.deferReply();
  let robloxId;
  if (input) {
    const u = isNaN(input) ? await getUserByUsername(input).catch(() => null) : { id: input };
    if (!u) return interaction.editReply(err(`**${input}** not found.`));
    robloxId = u.id;
  } else {
    const linked = getVerifiedUser(interaction.guild.id, interaction.user.id);
    if (!linked) return interaction.editReply(err('You don\'t have a linked account. Use `/verify` first.'));
    robloxId = linked.roblox_id;
  }
  const rank = await getUserRankInGroup(robloxId, groupId).catch(() => null);
  if (!rank) return interaction.editReply(err('Could not get rank — user may not be in that group.'));
  await interaction.editReply(card({
    title:  `Group Rank — ${rank.username ?? robloxId}`,
    desc:   `**${rank.roleName}** (rank ${rank.rank}) in group \`${groupId}\``,
    color:  COLORS.teal,
  }));
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
