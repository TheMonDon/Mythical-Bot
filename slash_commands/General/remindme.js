const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const chrono = require('chrono-node');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('remindme')
  .setDescription('Remind you about an event.')
  .addStringOption((option) =>
    option.setName('reminder').setDescription('ex: Remind me in 12 hours to eat breakfast').setRequired(true),
  );

exports.run = async (interaction, level) => {
  await interaction.deferReply();

  // Set the maximum reminders a person can have
  const maxReminders = 10;

  // Get the reminders from the global database and check generate an ID. If the ID exists, regen it.
  const reminders = (await db.get('global.reminders')) || [];
  let remID = interaction.client.util.randomString(5);
  while (reminders.length > 0 && reminders.includes(remID)) remID = interaction.client.util.randomString(5);

  // Filter reminders by the ones an individual user has and check if it's greater than or equal to maxReminders
  const userReminders = Object.values(reminders).filter((obj) => obj.userID === interaction.user.id);
  if (userReminders.length >= maxReminders && level < 8) {
    // The user has reached the maximum number of reminders
    return interaction.client.util.errorEmbed(interaction, 'You have reached the maximum number of reminders.');
  }

  // Clean the string from the user, and parse the results
  const string = interaction.options.getString('reminder');
  const cleanedArgs = await interaction.client.util.clean(interaction.client, string);
  const results = chrono.parse(cleanedArgs);

  // Check if the parser correctly understood the input
  if (!results?.[0]?.start) return interaction.editReply('Please provide a valid starting time.');

  // Conversions and dates
  const now = new Date();
  const start = results[0].start.date().getTime();
  const message = cleanedArgs;

  if (start <= now) return interaction.editReply('Please make sure your reminder is not part of back to the future.');
  if (isNaN(start) || !isFinite(start)) return interaction.editReply('Please provide a valid starting time.');
  if (message.length > 256) return interaction.editReply('Please keep your reminder under 256 characters.');

  const rand = '000000'.replace(/0/g, function () {
    return (~~(Math.random() * 16)).toString(16);
  });

  const embed = new EmbedBuilder()
    .setColor(rand)
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .addFields([{ name: '**I will remind you to:**', value: `\`\`\`${message}\`\`\`` }])
    .setDescription(`**I will remind you on:** \n<t:${Math.floor(start / 1000)}:F>`)
    .setFooter({ text: `ID: ${remID}` });

  const originalMessage = await interaction.editReply({ embeds: [embed] }).catch(() => {});

  const obj = {
    channelID: interaction.channel.id || null,
    createdAt: now.getTime(),
    userID: interaction.user.id,
    guildID: interaction.guild.id,
    reminder: message,
    triggerOn: start,
    originalMessage,
    color: rand,
    remID,
  };

  await db.set(`global.reminders.${remID}`, obj);
};
