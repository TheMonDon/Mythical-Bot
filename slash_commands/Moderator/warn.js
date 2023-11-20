const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('warn')
  .setDMPermission(false)
  .setDescription('Warns a user, by default members are kicked at 8 and banned at 10 points.')
  .addUserOption((option) => option.setName('user').setDescription('The user you want to warn').setRequired(true))
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('The amount of points to warn the user for')
      .setMinValue(1)
      .setMaxValue(1000)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option.setName('reason').setDescription('Why you are warning the user').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  const user = interaction.options.getUser('user');

  let member = true;
  let logMessage;
  let mem;

  mem = await interaction.client.util.getMember(interaction, user.id);
  if (!mem) {
    mem = user;
    member = false;
  }

  if (member ? mem.user.bot : mem.bot) return interaction.client.util.errorEmbed(interaction, "You can't warn a bot.");

  if (member) {
    const owner = await interaction.guild.fetchOwner();
    if (
      mem.roles.highest.position > interaction.member.roles.highest.position - 1 &&
      interaction.user.id !== owner.user.id
    )
      return interaction.client.util.errorEmbed(interaction, "You can't warn someone with a higher role than you.");
  }

  const points = interaction.options.getInteger('amount');
  let reason = interaction.options.getString('reason');

  // Grab the settings for the server
  const ka = (await db.get(`servers.${interaction.guild.id}.warns.kick`)) || 8;
  const ba = (await db.get(`servers.${interaction.guild.id}.warns.ban`)) || 10;
  const logChan = await db.get(`servers.${interaction.guild.id}.warns.channel`);

  // Make sure that the ID doesn't exist on that server
  let warnID = interaction.client.util.randomString(5);
  while (await db.has(`servers.${interaction.guild.id}.warns.warnings.${warnID}`)) {
    warnID = interaction.client.util.randomString(5);
  }

  // Get the users current warns and total points
  const otherWarns = await interaction.client.util.getWarns(mem.id, interaction);
  const warnAmount = (await interaction.client.util.getTotalPoints(mem.id, interaction)) + points;

  // Set the status and color of the embed
  let status = 'warned';
  let color = '#FFA500';
  if (warnAmount === ka) {
    status = 'kicked';
    color = '#FFD700';
  } else if (warnAmount >= ba) {
    status = 'banned';
    color = '#FF0000';
  }

  // Check if they have other cases
  let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';

  if (!reason) reason = 'Automated Ban';
  if (!otherCases) otherCases = 'No other cases';

  // Send the embed to the users DMS
  const userEmbed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`You have been ${status}`)
    .addFields([
      { name: 'Case ID', value: `\`${warnID}\`` },
      { name: 'Points', value: `${points} points (Total: ${warnAmount} points)` },
      { name: 'Other Cases', value: otherCases },
      { name: 'Reason', value: reason, inline: false },
    ])
    .setFooter({ text: `Issued in: ${interaction.guild.name}` });
  const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

  // Create the embed for the logs channel
  const logEmbed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: `${interaction.user.tag} • User ID: ${mem.id}` })
    .setTitle(`User has been ${status}`)
    .addFields([
      { name: 'User', value: `${mem} (${mem.id})`, inline: true },
      { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
      { name: 'Case ID', value: `\`${warnID}\``, inline: true },
      { name: 'Points', value: `${points} points (Total: ${warnAmount} points)`, inline: true },
      { name: 'Other Cases', value: otherCases, inline: true },
      { name: 'Reason', value: reason, inline: false },
    ]);
  if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

  // Check if the logs channel exists and send the message
  if (logChan) {
    logMessage = await interaction.guild.channels.cache
      .get(logChan)
      .send({ embeds: [logEmbed] })
      .catch(() => {});

    const channelEmbed = new EmbedBuilder()
      .setColor(color)
      .setFooter({ text: `${interaction.user.tag} • User ID: ${mem.id}` })
      .setTitle(`User has been ${status}`)
      .addFields([{ name: 'User', value: `${mem} (${mem.id})` }])
      .setURL(logMessage.url)
      .setDescription('Full info posted inside the log channel.');

    interaction.editReply({ embeds: [channelEmbed] });
  } else {
    logMessage = await interaction.editReply({ embeds: [logEmbed] });
  }

  // Add the warn to the database
  const opts = {
    messageURL: logMessage.url,
    mod: interaction.user.id,
    points,
    reason,
    timestamp: Date.now(),
    user: mem.id,
    warnID,
  };
  await db.set(`servers.${interaction.guild.id}.warns.warnings.${warnID}`, opts);

  // Check if they should be banned or kicked
  if (warnAmount >= ba) {
    if (!interaction.guild.members.me.permissions.has('BanMembers'))
      return interaction.editReply('The bot does not have permission to ban members.');
    interaction.guild.members.ban(mem.id, { reason }).catch(() => null); // Ban wether they are in the guild or not.
  } else if (warnAmount >= ka) {
    if (!interaction.guild.members.me.permissions.has('KickMembers'))
      return interaction.editReply('The bot does not have permission to kick members.');
    const member = interaction.guild.members.cache.get(mem.id);
    if (member) member.kick(reason).catch(() => null); // Kick them if they are in the guild
  }
};
