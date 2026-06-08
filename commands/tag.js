'use strict';

const { ok, err, card, COLORS, CV2 } = require('../utils/components');
const {
  getUserByUsername, getUserById, getGroupRoles, rankUser, getUserRankInGroup,
} = require('../utils/roblox');
const { getVerifyConfig } = require('../utils/database');
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  PermissionFlagsBits,
} = require('discord.js');

const category   = 'roblox';
const prefixName = 'tag';
const aliases    = ['t'];

// ── Tag definitions ───────────────────────────────────────────────────────────
// group 948951510 → 164 tag
// group 575770529 → lurk tag, AMOR TAG, KITTY TAG, YingYang

const TAG_MAP = {
  '164':       { groupId: '948951510', roleName: '164' },
  'lurk tag':  { groupId: '575770529', roleName: 'lurk tag' },
  'amor tag':  { groupId: '575770529', roleName: 'AMOR TAG' },
  'kitty tag': { groupId: '575770529', roleName: 'KITTY TAG' },
  'yingyang':  { groupId: '575770529', roleName: 'YingYang' },
};

const TAG_DISPLAY = ['164', 'KITTY TAG', 'lurk tag', 'AMOR TAG', 'YingYang'];

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

function resolveTag(input) {
  return TAG_MAP[input.toLowerCase()] ?? null;
}

function isTagManager(message) {
  if (message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const wl = require('../utils/database').getTagManagers(message.guild.id);
  if (wl.users.includes(message.author.id)) return true;
  for (const roleId of message.member.roles.cache.keys()) {
    if (wl.roles.includes(roleId)) return true;
  }
  return false;
}

async function prefixExecute(message, args) {
  const username = args[0];
  const tagInput = args.slice(1).join(' ').trim();

  if (!username || !tagInput) {
    return message.reply(card({
      title: 'Tag — Usage',
      desc:  [
        '`.tag <roblox_username> <tag>` — apply a Roblox tag to a user',
        '',
        `**Available tags:** ${TAG_DISPLAY.map(t => `\`${t}\``).join(', ')}`,
      ].join('\n'),
      color: 0xDD58FB,
    }));
  }

  if (!isTagManager(message)) {
    return message.reply(card({
      title: 'Invalid tag. Available tags:',
      desc:  TAG_DISPLAY.map(t => `\`${t}\``).join(', '),
      color: COLORS.red,
    }));
  }

  const tagDef = resolveTag(tagInput);
  if (!tagDef) {
    return message.reply(card({
      title: 'Invalid tag. Available tags:',
      desc:  TAG_DISPLAY.map(t => `\`${t}\``).join(', '),
      color: COLORS.red,
    }));
  }

  await message.channel.sendTyping().catch(() => {});

  const cfg = getVerifyConfig(message.guild.id);
  if (!cfg?.cookie) {
    return message.reply(err('No Roblox cookie configured. Use `.setcookie <cookie>` first.'));
  }

  let robloxUser;
  try {
    robloxUser = /^\d+$/.test(username)
      ? await getUserById(username)
      : await getUserByUsername(username);
  } catch {
    return message.reply(err('Failed to reach the Roblox API.'));
  }
  if (!robloxUser) return message.reply(err(`No Roblox account found for **${username}**.`));

  let roles;
  try {
    roles = await getGroupRoles(tagDef.groupId);
  } catch {
    return message.reply(err(`Failed to fetch roles for group \`${tagDef.groupId}\`.`));
  }

  const role = roles.find(r => r.name.toLowerCase() === tagDef.roleName.toLowerCase());
  if (!role) {
    return message.reply(err(`Role **${tagDef.roleName}** not found in group \`${tagDef.groupId}\`.`));
  }

  const memberCheck = await getUserRankInGroup(robloxUser.id, tagDef.groupId).catch(() => null);
  if (!memberCheck) {
    return message.reply(err(`**${robloxUser.name}** is not a member of group \`${tagDef.groupId}\`.`));
  }

  try {
    await rankUser(tagDef.groupId, robloxUser.id, role.id, cfg.cookie);
  } catch (e) {
    return message.reply(err(`Failed to apply tag: ${e.message}`));
  }

  const c = new ContainerBuilder().setAccentColor(0xDD58FB)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## Tag Applied\n**User** ${robloxUser.name} (\`${robloxUser.id}\`)\n**Tag** ${tagDef.roleName}\n**Group** \`${tagDef.groupId}\``
    ));
  return message.reply({ flags: require('discord.js').MessageFlags.IsComponentsV2, components: [c] });
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('tag')
  .setDescription('apply a Roblox group tag to a user')
  .addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true))
  .addStringOption(o => o.setName('tag').setDescription('tag name').setRequired(true)
    .addChoices(
      { name: '164',      value: '164' },
      { name: 'lurk tag', value: 'lurk tag' },
      { name: 'AMOR TAG', value: 'AMOR TAG' },
      { name: 'KITTY TAG', value: 'KITTY TAG' },
      { name: 'YingYang', value: 'YingYang' },
    ));

async function execute(interaction) {
  const username = interaction.options.getString('username');
  const tagInput = interaction.options.getString('tag');
  return prefixExecute(interaction, [username, ...tagInput.split(' ')]);
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
