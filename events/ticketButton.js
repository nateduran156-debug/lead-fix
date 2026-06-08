'use strict';

const {
  getGuild, getTicket, closeTicket, openTicket,
  getTicketConfig, getTagManagers, getVerifyConfig,
} = require('../utils/database');
const { ok, err, COLORS } = require('../utils/components');
const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, ModalBuilder, TextInputBuilder, TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { getUserByUsername, getUserGroups, getUserRankInGroup, getHeadshot } = require('../utils/roblox');

const CV2    = MessageFlags.IsComponentsV2;
const ACCENT = 0xDD58FB;
const ACCEPT_ROLE = '1505970868805697659';

const TAG_TICKET_CATEGORY    = '1511974634566844476';
const VERIFY_TICKET_CATEGORY = '1513373676312203335';

const S = (d = true) =>
  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(d);

// ── Permission helpers ────────────────────────────────────────────────────────

function isFullyWhitelisted(member, guildId) {
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const wl = getTagManagers(guildId);
  if (wl.users.includes(member.id)) return true;
  for (const roleId of member.roles.cache.keys()) {
    if (wl.roles.includes(roleId)) return true;
  }
  return false;
}

function isStaff(member, guildId) {
  if (isFullyWhitelisted(member, guildId)) return true;
  const cfg = getTicketConfig(guildId);
  if (cfg?.staff_role && member.roles.cache.has(cfg.staff_role)) return true;
  return false;
}

// ── Step 1: Show modal when user clicks open button ───────────────────────────

async function showTicketModal(interaction, ticketType) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${ticketType}`)
    .setTitle('Open a Ticket');

  const usernameInput = new TextInputBuilder()
    .setCustomId('roblox_username')
    .setLabel('Your Roblox Username')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your exact Roblox username')
    .setRequired(true)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));
  await interaction.showModal(modal);
}

// ── Step 2: Handle modal submit → create channel + run group check ────────────

async function handleModalSubmit(interaction, client) {
  const customId   = interaction.customId; // ticket_modal_tag | ticket_modal_verify | ticket_modal_support
  const ticketType = customId.replace('ticket_modal_', '');
  const robloxName = interaction.fields.getTextInputValue('roblox_username').trim();

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const user  = interaction.user;
  const g     = getGuild(guild.id);
  const cfg   = getTicketConfig(guild.id);

  // Check for duplicate open ticket
  const namePrefix = ticketType === 'tag' ? 'tag' : ticketType === 'verify' ? 'verify' : 'ticket';
  const existing   = guild.channels.cache.find(c =>
    c.name === `${namePrefix}-${user.username.toLowerCase()}`
  );
  if (existing) {
    return interaction.editReply({ ...err(`You already have an open ticket: ${existing}`), ephemeral: true });
  }

  // Resolve Roblox user
  let robloxUser = null;
  try {
    robloxUser = await getUserByUsername(robloxName);
  } catch {
    return interaction.editReply({ ...err('Could not reach the Roblox API. Try again in a moment.'), ephemeral: true });
  }
  if (!robloxUser) {
    return interaction.editReply({ ...err(`No Roblox account found for **${robloxName}**. Check the spelling and try again.`), ephemeral: true });
  }

  // Determine category
  let parentId = cfg?.category_id || null;
  if (ticketType === 'tag')    parentId = TAG_TICKET_CATEGORY;
  if (ticketType === 'verify') parentId = VERIFY_TICKET_CATEGORY;

  // Create the channel
  let channel;
  try {
    channel = await guild.channels.create({
      name:   `${namePrefix}-${user.username.toLowerCase()}`,
      type:   ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: [
        { id: guild.id,    deny:  [PermissionFlagsBits.ViewChannel] },
        { id: user.id,     allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ...(cfg?.staff_role ? [{ id: cfg.staff_role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
      ],
    });
  } catch (e) {
    return interaction.editReply({ ...err(`Failed to create ticket: ${e.message}`), ephemeral: true });
  }

  // Store ticket (roblox info stashed in topic for retrieval)
  openTicket(guild.id, channel.id, user.id);
  await channel.setTopic(`roblox:${robloxUser.id}:${robloxUser.name}`).catch(() => {});

  // ── Send ticket header ────────────────────────────────────────────────────
  const titleMap = { tag: 'Tag Request', verify: 'Verification Request', support: 'Support Ticket' };

  // Staff ping content
  const staffPing = cfg?.staff_role ? `<@&${cfg.staff_role}>` : null;

  const headerCard = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      [
        `## ticket opened`,
        `**opener:** ${user}`,
        `**roblox username:** \`${robloxUser.name}\``,
        '',
        `running a group check now, staff use the buttons below.`,
      ].join('\n')
    ));

  // Staff buttons — Row 1: Verify | Kick | Claim | Close Ticket
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_verify_${channel.id}`)
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ticket_kick_${channel.id}`)
      .setLabel('Kick')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_claim_${channel.id}`)
      .setLabel('Claim')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Secondary),
  );

  // Staff buttons — Row 2: Accept User
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_accept_${channel.id}`)
      .setLabel('Accept User')
      .setStyle(ButtonStyle.Success),
  );

  await channel.send({
    content: staffPing ?? undefined,
    flags: CV2,
    components: [headerCard, row1, row2],
  });

  // ── Auto group check ──────────────────────────────────────────────────────
  try {
    const [groups, headshot] = await Promise.all([
      getUserGroups(robloxUser.id).catch(() => []),
      getHeadshot(robloxUser.id).catch(() => null),
    ]);

    // Group list card
    const groupCard = new ContainerBuilder().setAccentColor(ACCENT);
    if (headshot) {
      const { SectionBuilder, ThumbnailBuilder } = require('discord.js');
      const section = new (require('discord.js').SectionBuilder)()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `## ${robloxUser.name}\n**Group Check**\n\n${robloxUser.name}`
        ))
        .setThumbnailAccessory(new (require('discord.js').ThumbnailBuilder)().setURL(headshot));
      groupCard.addSectionComponents(section);
    } else {
      groupCard.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## ${robloxUser.name}\n**Group Check**`
      ));
    }

    groupCard.addSeparatorComponents(S());

    if (groups.length) {
      const groupLines = groups.slice(0, 15).map(e => `• ${e.group.name}`).join('\n');
      groupCard
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Groups**\n${groupLines}`))
        .addSeparatorComponents(S(false))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `-# Page 1 of 1`
        ));
    } else {
      groupCard.addTextDisplayComponents(new TextDisplayBuilder().setContent('No groups found.'));
    }

    await channel.send({ flags: CV2, components: [groupCard] });

    // "In Group" check — use server's configured Roblox group
    const serverGroupId = g.roblox_group_id;
    if (serverGroupId) {
      const rankData = await getUserRankInGroup(robloxUser.id, serverGroupId).catch(() => null);
      const inGroup  = !!rankData;

      const inGroupCard = new ContainerBuilder()
        .setAccentColor(inGroup ? COLORS.green : COLORS.red)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          inGroup
            ? [
                `## In Group`,
                `${robloxUser.name} is in the group and ready to be verified.`,
                '',
                `**Group ID:** \`${serverGroupId}\``,
                `**Rank:** ${rankData.role?.name ?? 'Member'}`,
              ].join('\n')
            : [
                `## Not In Group`,
                `${robloxUser.name} is **not** in the server's Roblox group (\`${serverGroupId}\`).`,
              ].join('\n')
        ));

      await channel.send({ flags: CV2, components: [inGroupCard] });
    }
  } catch (e) {
    await channel.send({ ...err(`Group check failed: ${e.message}`) }).catch(() => {});
  }

  await interaction.editReply({ ...ok(`Your ticket has been opened: ${channel}`), ephemeral: true });
}

// ── Staff button handlers ─────────────────────────────────────────────────────

async function handleStaffButton(interaction, client) {
  const id      = interaction.customId;
  const guildId = interaction.guild.id;

  // Accept User — fully whitelisted only
  if (id.startsWith('ticket_accept_')) {
    if (!isFullyWhitelisted(interaction.member, guildId)) {
      return interaction.reply({ ...err('You need to be fully whitelisted to accept users.'), ephemeral: true });
    }
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('Ticket data not found.'), ephemeral: true });

    const targetMember = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
    if (!targetMember) return interaction.reply({ ...err('Could not find the ticket opener.'), ephemeral: true });

    try {
      await targetMember.roles.add(ACCEPT_ROLE);
    } catch (e) {
      return interaction.reply({ ...err(`Failed to add role: ${e.message}`), ephemeral: true });
    }

    const c = new ContainerBuilder().setAccentColor(COLORS.green)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${targetMember} has been accepted by ${interaction.user}.\nRole <@&${ACCEPT_ROLE}> granted.`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // All other staff buttons — require staff role or full whitelist
  if (!isStaff(interaction.member, guildId)) {
    return interaction.reply({ ...err('You need the staff role to use ticket controls.'), ephemeral: true });
  }

  // Verify
  if (id.startsWith('ticket_verify_')) {
    const verCfg = getVerifyConfig(guildId);
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('Ticket data not found.'), ephemeral: true });

    const targetMember = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
    if (!targetMember) return interaction.reply({ ...err('Could not find the ticket opener.'), ephemeral: true });

    if (!verCfg?.verified_role) {
      return interaction.reply({ ...err('No verified role configured. Use `.verify role @role` first.'), ephemeral: true });
    }
    try {
      await targetMember.roles.add(verCfg.verified_role);
    } catch (e) {
      return interaction.reply({ ...err(`Failed to add verified role: ${e.message}`), ephemeral: true });
    }
    const c = new ContainerBuilder().setAccentColor(COLORS.green)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${targetMember} has been verified by ${interaction.user}.`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // Kick
  if (id.startsWith('ticket_kick_')) {
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('Ticket data not found.'), ephemeral: true });

    const targetMember = await interaction.guild.members.fetch(ticket.user_id).catch(() => null);
    if (!targetMember) return interaction.reply({ ...err('Could not find the ticket opener — they may have already left.'), ephemeral: true });

    try {
      await targetMember.kick(`Kicked via ticket by ${interaction.user.tag}`);
    } catch (e) {
      return interaction.reply({ ...err(`Failed to kick: ${e.message}`), ephemeral: true });
    }
    const c = new ContainerBuilder().setAccentColor(COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${targetMember.user.username} was kicked from the server by ${interaction.user}.`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // Claim
  if (id.startsWith('ticket_claim_')) {
    const c = new ContainerBuilder().setAccentColor(ACCENT)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Ticket claimed by ${interaction.user}.\n-# <t:${Math.floor(Date.now() / 1000)}:T>`
      ));
    return interaction.reply({ flags: CV2, components: [c] });
  }

  // Close Ticket
  if (id === 'ticket_close') {
    const ticket = getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ ...err('This is not an open ticket.'), ephemeral: true });

    closeTicket(interaction.channel.id);
    const c = new ContainerBuilder().setAccentColor(COLORS.red)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Ticket closed by ${interaction.user}. Deleting in 5 seconds.`
      ));
    await interaction.reply({ flags: CV2, components: [c] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
}

module.exports = { showTicketModal, handleModalSubmit, handleStaffButton };
