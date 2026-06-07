'use strict';

const { card, err, COLORS }   = require('../../utils/components');
const { getUserByUsername, getUserById, getHeadshot } = require('../../utils/roblox');

const category   = 'roblox';
const prefixName = 'roblox';
const aliases    = ['rb', 'rblx', 'lookup'];

async function prefixExecute(message, args) {
  const input = args[0];
  if (!input) return message.reply(err('Provide a Roblox username or ID.'));

  await message.channel.sendTyping().catch(() => {});

  let user;
  try {
    if (/^\d+$/.test(input)) {
      user = await getUserById(input);
    } else {
      user = await getUserByUsername(input);
      if (user) user = await getUserById(user.id);
    }
  } catch {
    return message.reply(err('Failed to reach the Roblox API. Please try again later.'));
  }

  if (!user) return message.reply(err(`No Roblox account found for **${input}**.`));

  const headshot = await getHeadshot(user.id).catch(() => null);

  return message.reply(card({
    title:  user.name,
    fields: [
      { name: 'Display Name', value: user.displayName || user.name },
      { name: 'ID',           value: `\`${user.id}\`` },
      { name: 'Description',  value: user.description?.slice(0, 200) || 'None' },
      { name: 'Created',      value: user.created ? `<t:${Math.floor(new Date(user.created).getTime() / 1000)}:D>` : 'Unknown' },
      { name: 'Verified',     value: user.hasVerifiedBadge ? '✅ Yes' : 'No' },
    ],
    color:  COLORS.teal,
    image:  headshot,
    footer: `https://www.roblox.com/users/${user.id}/profile`,
  }));
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('roblox')
  .setDescription('look up a Roblox user — profile, avatar, badges')
  .addStringOption(o => o.setName('user').setDescription('Roblox username or ID').setRequired(true));

async function execute(interaction) {
  const input = interaction.options.getString('user');
  await interaction.deferReply();
  const u = isNaN(input)
    ? await getUserByUsername(input).catch(() => null)
    : await getUserById(input).catch(() => null);
  if (!u) return interaction.editReply(err(`**${input}** not found on Roblox.`));
  const hs = await getHeadshot(u.id).catch(() => null);
  await interaction.editReply(card({
    title:  u.displayName,
    desc:   `**[@${u.name}](https://www.roblox.com/users/${u.id}/profile)**\n${u.description?.slice(0, 200) || ''}`,
    fields: [
      { name: 'ID',      value: String(u.id),                                                              inline: true },
      { name: 'Created', value: `<t:${Math.floor(new Date(u.created).getTime() / 1000)}:D>`,              inline: true },
      { name: 'Profile', value: `[View](https://www.roblox.com/users/${u.id}/profile)`,                   inline: true },
    ],
    color: COLORS.teal,
    image: hs || undefined,
  }));
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
