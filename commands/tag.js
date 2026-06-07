'use strict';

const { getTag, getAllTags, setTag, deleteTag } = require('../utils/database');
const { ok, err, card, COLORS, CV2, C }         = require('../utils/components');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  PermissionFlagsBits,
} = require('discord.js');

const category   = 'tags';
const prefixName = 'tag';
const aliases    = ['t', 'tags'];

const S = (d = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

async function prefixExecute(message, args) {
  const sub = args[0]?.toLowerCase();

  // ── .tag list ────────────────────────────────────────────────────────────
  if (!sub || sub === 'list') {
    const tags = getAllTags(message.guild.id);
    if (!tags.length) return message.reply(card({ title: 'Tags', desc: 'No tags created yet.', color: COLORS.blue }));
    const c = new ContainerBuilder()
      .setAccentColor(COLORS.blue)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Tags'))
      .addSeparatorComponents(S())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        tags.map(t => `\`${t.name}\``).join(', ')
      ));
    return message.reply({ flags: require('discord.js').MessageFlags.IsComponentsV2, components: [c] });
  }

  // ── .tag create <name> <content> ─────────────────────────────────────────
  if (sub === 'create' || sub === 'add') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply(err('You need the **Manage Messages** permission to create tags.'));
    const name    = args[1]?.toLowerCase();
    const content = args.slice(2).join(' ');
    if (!name || !content) return message.reply(err('Usage: `.tag create <name> <content>`'));
    setTag(message.guild.id, name, content, message.author.id);
    return message.reply(ok(`Tag \`${name}\` has been saved.`));
  }

  // ── .tag delete <name> ───────────────────────────────────────────────────
  if (sub === 'delete' || sub === 'remove') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply(err('You need the **Manage Messages** permission to delete tags.'));
    const name = args[1]?.toLowerCase();
    if (!name) return message.reply(err('Provide the tag name to delete.'));
    const res  = deleteTag(message.guild.id, name);
    if (!res.changes) return message.reply(err(`No tag named \`${name}\` found.`));
    return message.reply(ok(`Tag \`${name}\` has been deleted.`));
  }

  // ── .tag <name> — display the tag ────────────────────────────────────────
  const name = sub;
  const tag  = getTag(message.guild.id, name);
  if (!tag) return message.reply(err(`No tag named \`${name}\` found.`));

  return message.reply({ content: tag.content });
}

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('tag')
  .setDescription('create, delete, or view saved tags (canned responses)')
  .addSubcommand(s => s
    .setName('create')
    .setDescription('create a new tag')
    .addStringOption(o => o.setName('name').setDescription('tag name').setRequired(true))
    .addStringOption(o => o.setName('content').setDescription('tag content').setRequired(true)))
  .addSubcommand(s => s
    .setName('delete')
    .setDescription('delete an existing tag')
    .addStringOption(o => o.setName('name').setDescription('tag to delete').setRequired(true)))
  .addSubcommand(s => s
    .setName('view')
    .setDescription('post a saved tag')
    .addStringOption(o => o.setName('name').setDescription('tag name').setRequired(true)))
  .addSubcommand(s => s.setName('list').setDescription('list all tags'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

async function execute(interaction) {
  const sub     = interaction.options.getSubcommand();
  const name    = interaction.options.getString('name');
  const content = interaction.options.getString('content');
  const args    = [sub, name, content].filter(Boolean);
  return prefixExecute(interaction, args);
}

module.exports = { data, execute, prefixName, aliases, category, prefixExecute };
