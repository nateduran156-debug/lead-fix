'use strict';

const {
  SlashCommandBuilder,
  ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { getGuild } = require('../../utils/database');

const CV2 = MessageFlags.IsComponentsV2;
const EPH = 1 << 6;
const S   = (size = SeparatorSpacingSize.Small, div = true) =>
  new SeparatorBuilder().setSpacing(size).setDivider(div);

const CATS = {
  moderation: {
    label: 'Moderation', color: 0xED4245,
    cmds: [
      { name: 'ban',           desc: 'Permanently ban a user from the server.',                 usage: '/ban user: @user [reason] [days]',                               example: '/ban user: @BadActor reason: spam days: 1',                    aliases: ['!ban', '!hackban'] },
      { name: 'kick',          desc: 'Remove a user from the server.',                          usage: '/kick user: @user [reason]',                                    example: '/kick user: @Troll reason: rule breaking',                     aliases: ['!kick', '!k'] },
      { name: 'unban',         desc: 'Lift a ban so the user can rejoin.',                      usage: '/unban user_id: 123456789 [reason]',                             example: '/unban user_id: 123456789012345678 reason: appeal accepted',  aliases: ['!unban'] },
      { name: 'warn',          desc: 'Issue a logged warning to a member.',                     usage: '/warn user: @user reason: <reason>',                             example: '/warn user: @Member reason: excessive pinging',                aliases: ['!warn'] },
      { name: 'warnings',      desc: 'List all active warnings for a user.',                    usage: '/warnings user: @user',                                         example: '/warnings user: @Repeat',                                      aliases: ['!warnings', '!warns'] },
      { name: 'clearwarns',    desc: 'Clear all warnings from a user\'s record.',               usage: '/clearwarns user: @user',                                       example: '/clearwarns user: @Reformed',                                  aliases: ['!clearwarns'] },
      { name: 'history',       desc: 'View full moderation history for a user.',                usage: '/history user: @user',                                          example: '/history user: @Suspect',                                      aliases: ['!history', '!mh'] },
      { name: 'timeout',       desc: 'Temporarily mute a user.',                               usage: '/timeout user: @user duration: <time> [reason]',                example: '/timeout user: @Spammer duration: 10m reason: spam',           aliases: ['!timeout', '!mute'] },
      { name: 'untimeout',     desc: 'Remove an active timeout.',                              usage: '/untimeout user: @user [reason]',                               example: '/untimeout user: @Calmed reason: served time',                 aliases: ['!untimeout', '!unmute'] },
      { name: 'purge',         desc: 'Bulk-delete messages in a channel.',                     usage: '/purge amount: <1-100> [user: @user]',                          example: '/purge amount: 50 user: @Spammer',                             aliases: ['!purge', '!clear'] },
      { name: 'lock',          desc: 'Prevent @everyone from sending messages in a channel.',  usage: '/lock [channel: #channel] [reason]',                            example: '/lock channel: #general reason: heated discussion',            aliases: ['!lock'] },
      { name: 'unlock',        desc: 'Restore send permissions in a channel.',                 usage: '/unlock [channel: #channel]',                                   example: '/unlock channel: #general',                                    aliases: ['!unlock'] },
      { name: 'lockall',       desc: 'Lock every text channel in the server.',                 usage: '/lockall [reason]',                                             example: '/lockall reason: raid in progress',                            aliases: ['!lockall', '!serverlock'] },
      { name: 'unlockall',     desc: 'Unlock all previously locked channels.',                 usage: '/unlockall',                                                    example: '/unlockall',                                                   aliases: ['!unlockall'] },
      { name: 'slowmode',      desc: 'Set a slowmode delay on a channel (0 = off).',           usage: '/slowmode seconds: <0-21600> [channel: #channel]',              example: '/slowmode seconds: 5 channel: #general',                       aliases: ['!slowmode', '!slow'] },
      { name: 'nick',          desc: 'Change or reset a member\'s nickname.',                  usage: '/nick user: @user [nickname]',                                  example: '/nick user: @Member nickname: CoolNick',                       aliases: ['!nick', '!nickname'] },
      { name: 'addrole',       desc: 'Give a role to a member.',                               usage: '/addrole user: @user role: @role',                              example: '/addrole user: @NewGuy role: @Member',                         aliases: ['!addrole', '!giverole'] },
      { name: 'removerole',    desc: 'Take a role away from a member.',                        usage: '/removerole user: @user role: @role',                           example: '/removerole user: @Member role: @Booster',                     aliases: ['!removerole'] },
      { name: 'roleall',       desc: 'Give a role to every member in the server.',             usage: '/roleall role: @role',                                          example: '/roleall role: @Verified',                                     aliases: ['!roleall'] },
      { name: 'unroleall',     desc: 'Remove a role from every member.',                       usage: '/unroleall role: @role',                                        example: '/unroleall role: @OldMember',                                  aliases: ['!unroleall'] },
      { name: 'softban',       desc: 'Ban then immediately unban to wipe recent messages.',    usage: '/softban user: @user [reason]',                                 example: '/softban user: @Raider reason: clean messages',                aliases: ['!softban'] },
      { name: 'tempban',       desc: 'Ban a user for a set duration, then auto-unban.',        usage: '/tempban user: @user duration: <time> [reason]',                example: '/tempban user: @Drama duration: 7d reason: drama',             aliases: ['!tempban'] },
      { name: 'massban',       desc: 'Ban multiple user IDs at once.',                         usage: '/massban userids: <id1 id2 id3> [reason]',                      example: '/massban userids: 111 222 333 reason: raid group',             aliases: ['!massban', '!bulkban'] },
      { name: 'deafen',        desc: 'Server-deafen a user in voice.',                         usage: '/deafen user: @user [reason]',                                  example: '/deafen user: @Loud reason: disrupting VC',                    aliases: ['!deafen'] },
      { name: 'move',          desc: 'Move a user to another voice channel.',                  usage: '/move user: @user channel: #vc',                                example: '/move user: @AFK channel: #general-vc',                        aliases: ['!move', '!vmove'] },
      { name: 'nuke',          desc: 'Clone a channel then delete the original.',              usage: '/nuke [reason]',                                                example: '/nuke reason: chat got too toxic',                             aliases: ['!nuke'] },
      { name: 'createrole',    desc: 'Create a new role.',                                     usage: '/createrole name: <name>',                                      example: '/createrole name: Regulars',                                   aliases: ['!createrole', '!cr'] },
      { name: 'deleterole',    desc: 'Delete an existing role.',                               usage: '/deleterole role: @role',                                       example: '/deleterole role: @TempRole',                                  aliases: ['!deleterole'] },
      { name: 'createchannel', desc: 'Create a new text or voice channel.',                    usage: '/createchannel name: <name> [type: text|voice]',                example: '/createchannel name: announcements type: text',                aliases: ['!createchannel', '!cc'] },
      { name: 'deletechannel', desc: 'Delete a channel from the server.',                      usage: '/deletechannel channel: #channel',                              example: '/deletechannel channel: #old-chat',                            aliases: ['!deletechannel'] },
      { name: 'clonechannel',  desc: 'Duplicate a channel and its permissions.',               usage: '/clonechannel [channel: #channel]',                             example: '/clonechannel channel: #rules',                                aliases: ['!clonechannel', '!clone'] },
    ],
  },
  antinuke: {
    label: 'Anti-Nuke', color: 0xFF6B35,
    cmds: [
      { name: 'antinuke enable',    desc: 'Activate anti-nuke protection.',                             usage: '/antinuke enable',                                   example: '/antinuke enable',                         aliases: ['!antinuke enable'] },
      { name: 'antinuke disable',   desc: 'Turn off anti-nuke protection.',                             usage: '/antinuke disable',                                  example: '/antinuke disable',                        aliases: ['!antinuke disable'] },
      { name: 'antinuke status',    desc: 'View the current anti-nuke config and thresholds.',          usage: '/antinuke status',                                   example: '/antinuke status',                         aliases: ['!antinuke status'] },
      { name: 'antinuke whitelist', desc: 'Add a trusted user to the anti-nuke whitelist.',            usage: '/antinuke whitelist user: @user',                    example: '/antinuke whitelist user: @Admin',          aliases: ['!antinuke whitelist'] },
      { name: 'antinuke threshold', desc: 'Set how many actions trigger anti-nuke for an event type.', usage: '/antinuke threshold action: <type> count: <number>', example: '/antinuke threshold action: ban count: 2', aliases: ['!antinuke threshold'] },
      { name: 'antinuke reset',     desc: 'Reset all anti-nuke settings to defaults.',                 usage: '/antinuke reset',                                    example: '/antinuke reset',                          aliases: ['!antinuke reset'] },
    ],
  },
  roblox: {
    label: 'Roblox', color: 0x00B4D8,
    cmds: [
      { name: 'verify',     desc: 'Link your Roblox account to Discord.',                    usage: '/verify username: <roblox_name>',             example: '/verify username: builderman',            aliases: ['!verify'] },
      { name: 'unverify',   desc: 'Unlink your Roblox account.',                             usage: '/unverify',                                   example: '/unverify',                               aliases: ['!unverify'] },
      { name: 'linked',     desc: 'Check which Roblox account a Discord user is linked to.', usage: '/linked user: @user',                         example: '/linked user: @FriendName',               aliases: ['!linked'] },
      { name: 'roblox',     desc: 'Look up a Roblox user — profile, avatar, badges.',        usage: '/roblox user: <username>',                    example: '/roblox user: Roblox',                    aliases: ['!roblox'] },
      { name: 'rank',       desc: 'Change a Roblox user\'s rank in your group.',             usage: '/rank username: <name> rank: <name or id>',   example: '/rank username: builderman rank: Officer', aliases: ['!rank', '!setrank'] },
      { name: 'setgroup',   desc: 'Link a Roblox group to this server.',                     usage: '/setgroup group_id: <id>',                    example: '/setgroup group_id: 1234567',             aliases: ['!setgroup'] },
      { name: 'groupinfo',  desc: 'Show info about a Roblox group.',                         usage: '/groupinfo [group_id: <id>]',                  example: '/groupinfo group_id: 1234567',            aliases: ['!groupinfo'] },
      { name: 'groupcheck', desc: 'List all groups a Roblox user is in with their rank.',    usage: '/groupcheck username: <name>',                example: '/groupcheck username: builderman',        aliases: ['!groupcheck'] },
      { name: 'groupwall',  desc: 'View recent group wall posts.',                           usage: '/groupwall [group_id: <id>]',                  example: '/groupwall group_id: 1234567',            aliases: ['!groupwall'] },
      { name: 'shout',      desc: 'Update your Roblox group shout.',                         usage: '/shout message: <text>',                      example: '/shout message: Meeting in 30 minutes!',  aliases: ['!shout'] },
      { name: 'game',       desc: 'Look up a Roblox game by place ID.',                      usage: '/game placeid: <id>',                         example: '/game placeid: 920587237',                aliases: ['!game'] },
      { name: 'rap',        desc: 'Get total RAP for a Roblox user\'s limiteds.',            usage: '/rap username: <name>',                       example: '/rap username: builderman',               aliases: ['!rap'] },
      { name: 'badges',     desc: 'List the badges a Roblox user has earned.',               usage: '/badges username: <name>',                    example: '/badges username: Roblox',                aliases: ['!badges'] },
      { name: 'friends',    desc: 'Show a Roblox user\'s friends list.',                     usage: '/friends username: <name>',                   example: '/friends username: builderman',           aliases: ['!friends'] },
      { name: 'outfit',     desc: 'Preview a Roblox user\'s current outfit.',                usage: '/outfit username: <name>',                    example: '/outfit username: Roblox',                aliases: ['!outfit'] },
      { name: 'presence',   desc: 'Check if a Roblox user is currently online.',             usage: '/presence username: <name>',                  example: '/presence username: builderman',          aliases: ['!presence'] },
      { name: 'catalog',    desc: 'Search the Roblox catalog for items.',                    usage: '/catalog query: <search>',                    example: '/catalog query: dragon sword',            aliases: ['!catalog'] },
      { name: 'games',      desc: 'List games created by a Roblox user.',                    usage: '/games username: <name>',                     example: '/games username: builderman',             aliases: ['!games'] },
    ],
  },
  rankpoints: {
    label: 'Rank Points', color: 0x9B59B6,
    cmds: [
      { name: 'rankpoints give',  desc: 'Award rank points to a member.',                 usage: '/rankpoints give user: @user amount: <n>',  example: '/rankpoints give user: @TopRaider amount: 50', aliases: ['!rankpoints give'] },
      { name: 'rankpoints take',  desc: 'Remove rank points from a member.',              usage: '/rankpoints take user: @user amount: <n>',  example: '/rankpoints take user: @Member amount: 10',    aliases: ['!rankpoints take'] },
      { name: 'rankpoints set',   desc: 'Set a member\'s rank points to an exact value.', usage: '/rankpoints set user: @user amount: <n>',   example: '/rankpoints set user: @Member amount: 100',   aliases: ['!rankpoints set'] },
      { name: 'rankpoints check', desc: 'Check how many rank points a user has.',         usage: '/rankpoints check user: @user',             example: '/rankpoints check user: @Member',              aliases: ['!rankpoints check'] },
      { name: 'rankpoints reset', desc: 'Reset a user\'s rank points to zero.',           usage: '/rankpoints reset user: @user',             example: '/rankpoints reset user: @Member',              aliases: ['!rankpoints reset'] },
      { name: 'rankpoints top',   desc: 'View the rank points leaderboard.',              usage: '/rankpoints top',                           example: '/rankpoints top',                              aliases: ['!rankpoints top'] },
    ],
  },
  raidpoints: {
    label: 'Raid Points', color: 0xE74C3C,
    cmds: [
      { name: 'raidpoints add',      desc: 'Add raid points to a member.',                            usage: '/raidpoints add user: @user amount: <n>',             example: '/raidpoints add user: @Raider amount: 25',         aliases: ['!raidpoints add'] },
      { name: 'raidpoints remove',   desc: 'Subtract raid points from a member.',                     usage: '/raidpoints remove user: @user amount: <n>',          example: '/raidpoints remove user: @Member amount: 10',      aliases: ['!raidpoints remove'] },
      { name: 'raidpoints check',    desc: 'Check a user\'s current raid points.',                    usage: '/raidpoints check user: @user',                       example: '/raidpoints check user: @Raider',                  aliases: ['!raidpoints check'] },
      { name: 'raidpoints top',      desc: 'View the raid points leaderboard.',                       usage: '/raidpoints top',                                     example: '/raidpoints top',                                  aliases: ['!raidpoints top'] },
      { name: 'raidpoints season',   desc: 'View or change the current raid season.',                 usage: '/raidpoints season [number: <n>]',                    example: '/raidpoints season number: 4',                     aliases: ['!raidpoints season'] },
      { name: 'raidpoints transfer', desc: 'Transfer a user\'s raid points to rank points.',          usage: '/raidpoints transfer user: @user [multiplier: <n>]',  example: '/raidpoints transfer user: @Raider multiplier: 2', aliases: ['!raidpoints transfer'] },
      { name: 'raidpoints reset',    desc: 'Reset a specific user\'s raid points this season.',       usage: '/raidpoints reset user: @user',                       example: '/raidpoints reset user: @Member',                  aliases: ['!raidpoints reset'] },
    ],
  },
  vanity: {
    label: 'Vanity Tracker', color: 0xFEE75C,
    cmds: [
      { name: 'vanity track',   desc: 'Track a Discord vanity URL for availability.',   usage: '/vanity track url: <vanity>',   example: '/vanity track url: cool',   aliases: ['!vanity track'] },
      { name: 'vanity untrack', desc: 'Stop tracking a vanity URL.',                    usage: '/vanity untrack url: <vanity>', example: '/vanity untrack url: cool', aliases: ['!vanity untrack'] },
      { name: 'vanity list',    desc: 'List all vanity URLs being tracked.',            usage: '/vanity list',                  example: '/vanity list',              aliases: ['!vanity list'] },
      { name: 'vanity logs',    desc: 'View recent vanity availability events.',        usage: '/vanity logs',                  example: '/vanity logs',              aliases: ['!vanity logs'] },
      { name: 'vanity status',  desc: 'Check the status of a specific vanity URL.',     usage: '/vanity status url: <vanity>',  example: '/vanity status url: cool',  aliases: ['!vanity status'] },
    ],
  },
  sniper: {
    label: 'Username Sniper', color: 0x57F287,
    cmds: [
      { name: 'sniper add',    desc: 'Get alerted when a Roblox user comes online.',   usage: '/sniper add username: <name>',    example: '/sniper add username: builderman',    aliases: ['!sniper add'] },
      { name: 'sniper remove', desc: 'Remove a user from your snipe list.',            usage: '/sniper remove username: <name>', example: '/sniper remove username: builderman', aliases: ['!sniper remove'] },
      { name: 'sniper list',   desc: 'View all users currently being sniped.',         usage: '/sniper list',                    example: '/sniper list',                        aliases: ['!sniper list'] },
      { name: 'sniper clear',  desc: 'Clear your entire snipe list.',                  usage: '/sniper clear',                   example: '/sniper clear',                       aliases: ['!sniper clear'] },
      { name: 'sniper status', desc: 'Check online status of all sniped users now.',   usage: '/sniper status',                  example: '/sniper status',                      aliases: ['!sniper status'] },
    ],
  },
  server: {
    label: 'Server Info', color: 0x5865F2,
    cmds: [
      { name: 'serverinfo',  desc: 'Overview of the server — members, boosts, channels.', usage: '/serverinfo',               example: '/serverinfo',                    aliases: ['!serverinfo', '!si'] },
      { name: 'userinfo',    desc: 'Info about a Discord user — join date, roles.',        usage: '/userinfo [user: @user]',   example: '/userinfo user: @Member',        aliases: ['!userinfo', '!ui'] },
      { name: 'roleinfo',    desc: 'Details about a role — color, perms, member count.',  usage: '/roleinfo role: @role',     example: '/roleinfo role: @Moderator',     aliases: ['!roleinfo', '!ri'] },
      { name: 'channelinfo', desc: 'Details about a channel — type, topic, slowmode.',    usage: '/channelinfo [channel: #]', example: '/channelinfo channel: #general', aliases: ['!channelinfo'] },
      { name: 'avatar',      desc: 'Get a user\'s avatar as a full-size image.',          usage: '/avatar [user: @user]',     example: '/avatar user: @Member',          aliases: ['!avatar', '!av'] },
      { name: 'membercount', desc: 'Total member count split by bots and humans.',        usage: '/membercount',              example: '/membercount',                   aliases: ['!membercount', '!mc'] },
    ],
  },
  giveaway: {
    label: 'Giveaways', color: 0xFFD700,
    cmds: [
      { name: 'giveaway start',  desc: 'Start a giveaway with duration, prize, and winners.',  usage: '/giveaway start duration: <time> winners: <n> prize: <text>', example: '/giveaway start duration: 24h winners: 1 prize: Robux 1000', aliases: ['!gstart'] },
      { name: 'giveaway end',    desc: 'End a giveaway immediately and pick winners.',          usage: '/giveaway end message_id: <id>',                               example: '/giveaway end message_id: 123456789',                         aliases: ['!gend'] },
      { name: 'giveaway reroll', desc: 'Pick a new winner if the original didn\'t claim.',     usage: '/giveaway reroll message_id: <id>',                            example: '/giveaway reroll message_id: 123456789',                      aliases: ['!greroll'] },
      { name: 'giveaway list',   desc: 'List all active giveaways in the server.',             usage: '/giveaway list',                                               example: '/giveaway list',                                              aliases: ['!glist'] },
    ],
  },
  tickets: {
    label: 'Tickets', color: 0x3498DB,
    cmds: [
      { name: 'ticket setup', desc: 'Configure the ticket system.',    usage: '/ticket setup role: @support',  example: '/ticket setup role: @Support', aliases: [] },
      { name: 'ticket panel', desc: 'Send the ticket creation panel.', usage: '/ticket panel [channel: #]',    example: '/ticket panel channel: #open-ticket', aliases: [] },
      { name: 'ticket close', desc: 'Close the current ticket.',       usage: '/ticket close [reason]',        example: '/ticket close reason: resolved', aliases: ['!close'] },
      { name: 'ticket add',   desc: 'Add a user to the current ticket.', usage: '/ticket add user: @user',    example: '/ticket add user: @Helper', aliases: [] },
      { name: 'ticket remove',desc: 'Remove a user from the ticket.', usage: '/ticket remove user: @user',    example: '/ticket remove user: @Member', aliases: [] },
    ],
  },
  welcome: {
    label: 'Welcome', color: 0x2ECC71,
    cmds: [
      { name: 'welcome setup',   desc: 'Set the welcome channel and message. Use {user} and {server} as placeholders.', usage: '/welcome setup channel: #channel message: <text>', example: '/welcome setup channel: #welcome message: Welcome {user}!', aliases: [] },
      { name: 'welcome enable',  desc: 'Enable the welcome system.',   usage: '/welcome enable',  example: '/welcome enable',  aliases: [] },
      { name: 'welcome disable', desc: 'Disable the welcome system.',  usage: '/welcome disable', example: '/welcome disable', aliases: [] },
      { name: 'welcome test',    desc: 'Send a test welcome message.', usage: '/welcome test',    example: '/welcome test',    aliases: [] },
    ],
  },
  logging: {
    label: 'Logging', color: 0x95A5A6,
    cmds: [
      { name: 'logs setup',   desc: 'Set the fallback log channel.',     usage: '/logs setup channel: #channel',   example: '/logs setup channel: #server-logs', aliases: [] },
      { name: 'logs modlogs', desc: 'Set a separate channel for mod actions.', usage: '/logs modlogs channel: #channel', example: '/logs modlogs channel: #mod-logs', aliases: [] },
    ],
  },
  misc: {
    label: 'Misc', color: 0x99AAB5,
    cmds: [
      { name: 'ping',     desc: 'Check the bot\'s latency.',                usage: '/ping',             example: '/ping',              aliases: ['!ping'] },
      { name: 'botinfo',  desc: 'Show info about the bot.',                  usage: '/botinfo',          example: '/botinfo',           aliases: ['!botinfo'] },
      { name: 'help',     desc: 'List commands or browse a category.',       usage: '/help [category]',  example: '/help moderation',   aliases: ['!help'] },
      { name: 'settings', desc: 'View this server\'s bot configuration.',    usage: '/settings',         example: '/settings',          aliases: ['!settings'] },
      { name: 'prefix',   desc: 'Change the bot prefix for this server.',    usage: '/prefix <prefix>',  example: '/prefix !',          aliases: ['!prefix'] },
    ],
  },
};

const CMD_META = Object.fromEntries(
  Object.entries(CATS).flatMap(([, cat]) =>
    cat.cmds.map(cmd => [cmd.name, { ...cmd, color: cat.color, label: cat.label }])
  )
);

function mainPage(prefix) {
  const lines = Object.entries(CATS).map(([, cat]) =>
    `**${cat.label}** — ${cat.cmds.length} commands`
  );
  const c = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Command Categories'))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addSeparatorComponents(S(SeparatorSpacingSize.Small, false))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `-# use \`/help category\` or \`${prefix}help <category>\` to browse · prefix \`${prefix}\``
    ));
  return { flags: CV2, components: [c] };
}

function navRow(catKey, page) {
  const total = CATS[catKey].cmds.length;
  const prev  = new ButtonBuilder().setCustomId('help_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0);
  const next  = new ButtonBuilder().setCustomId('help_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1);
  const info  = new ButtonBuilder().setCustomId('help_info').setLabel(`${page + 1} / ${total}`).setStyle(ButtonStyle.Secondary).setDisabled(true);
  return new ActionRowBuilder().addComponents(prev, info, next);
}

function cmdPage(catKey, page, prefix = '!') {
  const cat = CATS[catKey];
  const cmd = cat.cmds[page];
  const c   = new ContainerBuilder()
    .setAccentColor(cat.color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${cmd.name}\n${cmd.desc}`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Category** ${cat.label}${cmd.aliases?.length ? `\n**Also** ${cmd.aliases.map(a => `\`${a}\``).join(' ')}` : ''}`
    ))
    .addSeparatorComponents(S())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `\`\`\`\nSyntax:   ${cmd.usage}\nExample:  ${cmd.example}\n\`\`\``
    ));
  return { flags: CV2, components: [c, navRow(catKey, page)] };
}

// ─── Slash command ──────────────────────────────────────────────────────────

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('list commands or view a category')
  .addStringOption(o =>
    o.setName('category')
      .setDescription('category to browse')
      .addChoices(...Object.entries(CATS).map(([k, v]) => ({ name: v.label, value: k })))
  );

const category   = 'misc';
const prefixName = 'help';
const aliases    = ['h', 'commands', 'cmds'];

async function execute(interaction) {
  const prefix = getGuild(interaction.guild.id).prefix || '!';
  const catArg = interaction.options.getString('category');

  if (!catArg) return interaction.reply(mainPage(prefix));

  let page = 0;
  const initial = cmdPage(catArg, page, prefix);
  const msg = await interaction.reply({ ...initial, fetchReply: true });

  const col = msg.createMessageComponentCollector({ time: 120_000 });
  col.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('Not your menu.'));
      return i.reply({ flags: CV2 | EPH, components: [c] });
    }
    const total = CATS[catArg].cmds.length;
    if (i.customId === 'help_prev') page = Math.max(0, page - 1);
    if (i.customId === 'help_next') page = Math.min(total - 1, page + 1);
    await i.update(cmdPage(catArg, page, prefix));
  });
  col.on('end', () => {
    const base = cmdPage(catArg, page, prefix);
    interaction.editReply({ ...base, components: base.components.slice(0, 1) }).catch(() => {});
  });
}

async function prefixExecute(message, args) {
  const prefix = getGuild(message.guild.id).prefix || '!';
  const catArg = args[0]?.toLowerCase();

  if (!catArg || !CATS[catArg]) return message.reply(mainPage(prefix));

  let page = 0;
  const initial = cmdPage(catArg, page, prefix);
  const msg = await message.reply({ ...initial, fetchReply: true });

  const col = msg.createMessageComponentCollector({ time: 120_000 });
  col.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('Not your menu.'));
      return i.reply({ flags: CV2 | EPH, components: [c] });
    }
    const total = CATS[catArg].cmds.length;
    if (i.customId === 'help_prev') page = Math.max(0, page - 1);
    if (i.customId === 'help_next') page = Math.min(total - 1, page + 1);
    await i.update(cmdPage(catArg, page, prefix));
  });
  col.on('end', () => {
    const base = cmdPage(catArg, page, prefix);
    msg.edit({ ...base, components: base.components.slice(0, 1) }).catch(() => {});
  });
}

module.exports = { data, CMD_META, execute, prefixExecute, prefixName, aliases, category };
