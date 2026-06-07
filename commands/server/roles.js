'use strict';

const { card, COLORS } = require('../../utils/components');

const category   = 'server';
const prefixName = 'roles';
const aliases    = ['rolelist', 'listroles'];

async function prefixExecute(message) {
  const roles = [...message.guild.roles.cache.values()]
    .sort((a, b) => b.position - a.position)
    .filter(r => r.id !== message.guild.id);

  const lines = roles.slice(0, 30).map(r => `<@&${r.id}> \`${r.members.size}\``).join('\n');

  return message.reply(card({
    title:  `${message.guild.name} — Roles`,
    desc:   lines + (roles.length > 30 ? `\n*…and ${roles.length - 30} more*` : ''),
    color:  COLORS.blue,
    footer: `${roles.length} role${roles.length === 1 ? '' : 's'}`,
  }));
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('list all roles in the server with their member counts');

async function execute(interaction) {
  return prefixExecute(interaction, []);
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
