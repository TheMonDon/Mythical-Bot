const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const chrono = require('chrono-node');

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
  const connection = await interaction.client.db.getConnection();

  // Set the maximum reminders a person can have
  const maxReminders = 10;

  // Generate an ID and check in the MySQL table until we find a free one
  let remID = interaction.client.util.randomString(5);

  let [rows] = await connection.execute(
    /* sql */ `
      SELECT
        1
      FROM
        reminders
      WHERE
        reminder_id = ?
      LIMIT
        1
    `,
    [remID],
  );

  while (rows.length > 0) {
    remID = interaction.client.util.randomString(5);
    [rows] = await connection.execute(
      /* sql */ `
        SELECT
          1
        FROM
          reminders
        WHERE
          reminder_id = ?
        LIMIT
          1
      `,
      [remID],
    );
  }

  // Filter reminders by the ones an individual user has and check if it's greater than or equal to maxReminders
  const [userReminders] = await connection.execute(
    /* sql */ `
      SELECT
        *
      FROM
        reminders
      WHERE
        user_id = ?
    `,
    [interaction.user.id],
  );

  if (userReminders.length >= maxReminders && level < 8) {
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
  const triggerOn = results[0].start.date().getTime();
  const reminderText = cleanedArgs;

  if (triggerOn <= now) {
    return interaction.editReply('Please make sure your reminder is not part of back to the future.');
  }
  if (isNaN(triggerOn) || !isFinite(triggerOn)) {
    return interaction.editReply('Please provide a valid starting time.');
  }
  if (reminderText.length > 1000) {
    return interaction.editReply('Please keep your reminder under 1000 characters.');
  }

  const randColor = '000000'.replace(/0/g, function () {
    return (~~(Math.random() * 16)).toString(16);
  });

  const embed = new EmbedBuilder()
    .setColor(randColor)
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .addFields([{ name: '**I will remind you to:**', value: `\`\`\`${reminderText}\`\`\`` }])
    .setDescription(`**I will remind you on:** \n<t:${Math.floor(triggerOn / 1000)}:F>`)
    .setFooter({ text: `ID: ${remID}` });

  const originalMessage = await interaction.editReply({ embeds: [embed] }).catch(() => {});
  const directMessage = !interaction.guild;

  await connection.execute(
    /* sql */
    `
      INSERT INTO
        reminders (
          reminder_id,
          color,
          original_message_id,
          user_id,
          channel_id,
          guild_id,
          reminder_text,
          created_at,
          trigger_on,
          direct_message
        )
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      remID,
      randColor,
      originalMessage.id || null,
      interaction.user.id,
      interaction.channel?.id || null,
      interaction.guild?.id || null,
      reminderText,
      now.getTime(), // created_at
      triggerOn,
      directMessage,
    ],
  );
};
