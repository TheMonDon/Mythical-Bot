const { EmbedBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const chrono = require('chrono-node');

class RemindMe extends Command {
  constructor(client) {
    super(client, {
      name: 'remind-me',
      description: 'Gives you a reminder',
      examples: ['remind-me Ban Zeph in 1 year', 'remind-me eat breakfast in 69 minutes'],
      usage: 'remind-me <reminder>',
      requiredArgs: 1,
      category: 'General',
      aliases: ['remind', 'remindme'],
    });
  }

  async run(msg, args, level) {
    const connection = await this.client.db.getConnection();

    // Set the maximum reminders a person can have
    const maxReminders = 10;

    // Generate an ID and check in the MySQL table until we find a free one
    let remID = this.client.util.randomString(5);

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
      remID = this.client.util.randomString(5);
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
      [msg.author.id],
    );

    if (userReminders.length >= maxReminders && level < 8) {
      return this.client.util.errorEmbed(msg, 'You have reached the maximum number of reminders.');
    }

    // Clean the string from the user, and parse the results
    const cleanedArgs = await this.client.util.clean(this.client, args.join(' '));
    const results = chrono.parse(cleanedArgs);

    // Check if the parser correctly understood the input
    if (!results?.[0]?.start) return msg.channel.send('Please provide a valid starting time.');

    // Conversions and dates
    const now = new Date();
    const triggerOn = results[0].start.date().getTime();
    const reminderText = cleanedArgs;

    if (triggerOn <= now) return msg.channel.send('Please make sure your reminder is not part of Back to the Future.');
    if (isNaN(triggerOn) || !isFinite(triggerOn)) return msg.channel.send('Please provide a valid starting time.');
    if (reminderText.length > 1000) return msg.channel.send('Please keep your reminder under 1000 characters.');

    const randColor = '000000'.replace(/0/g, function () {
      return (~~(Math.random() * 16)).toString(16);
    });

    const embed = new EmbedBuilder()
      .setColor(randColor)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .addFields([{ name: '**I will remind you to:**', value: `\`\`\`${reminderText}\`\`\`` }])
      .setDescription(`**I will remind you on:** \n<t:${Math.floor(triggerOn / 1000)}:F>`)
      .setFooter({ text: `ID: ${remID}` });

    const originalMessage = await msg.channel.send({ embeds: [embed] }).catch(() => {});
    const directMessage = !msg.guild;

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
        msg.author.id,
        msg.channel?.id || null,
        msg.guild?.id || null,
        reminderText,
        now.getTime(), // created_at
        triggerOn,
        directMessage,
      ],
    );
  }
}

module.exports = RemindMe;
