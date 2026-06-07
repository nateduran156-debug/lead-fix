'use strict';

const { ok, err } = require('../utils/components');
const { PermissionFlagsBits } = require('discord.js');

const category   = 'tags';
const prefixName = 'striptag';
const aliases    = ['tagstrip'];

async function prefixExecute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
    return message.reply(err('You need the **Manage Messages** permission.'));

  const member = message.mentions.members.first();
  if (!member) return message.reply(err('Mention a member to strip tags from.'));

  // Remove all roles whose names start with "[" (tag-style roles)
  const tagRoles = member.roles.cache.filter(r => r.name.startsWith('['));
  if (!tagRoles.size) return message.reply(err(`${member.user.username} has no tag roles to strip.`));

  for (const [, role] of tagRoles) {
    await member.roles.remove(role).catch(() => {});
  }

  return message.reply(ok(`Stripped **${tagRoles.size}** tag role(s) from ${member.user.username}.`));
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('striptag')
  .setDescription('remove all non-alphanumeric characters from a member\'s nickname')
  .addUserOption(o => o.setName('user').setDescription('member to strip tags from').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames);

async function execute(interaction) {
  const user   = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply(err('Member not found.'));
  const stripped = (member.nickname || member.user.username).replace(/[^a-zA-Z0-9 ]/g, '').trim() || member.user.username;
  try {
    await member.setNickname(stripped);
    await interaction.reply(ok(`Stripped tags from ${user}: **${stripped}**`));
  } catch (e) {
    await interaction.reply(err(`Failed: ${e.message}`));
  }
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
