const { EmbedBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const chrono = require('chrono-node');
const db = new QuickDB();

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
    // Set the maximum reminders a person can have
    const maxReminders = 10;
    const maxDonorReminders = 64;
    const donatorStatus = (await db.get(`users.${msg.author.id}.donator`)) || false;

    // Get the reminders from the global database and check generate an ID. If the ID exists, regen it.
    let reminders = await db.get('global.reminders');
    if (!Array.isArray(reminders)) {
      reminders = Object.values(reminders || {});
    }

    let remID = this.client.util.randomString(5);
    while (reminders.some((reminder) => reminder.remID === remID)) {
      remID = this.client.util.randomString(5);
    }

    // Filter reminders by the ones an individual user has and check if it's greater than or equal to maxReminders
    const userReminders = reminders.filter((obj) => obj.userID === msg.author.id);

    if (donatorStatus && userReminders.length >= maxDonorReminders) {
      return this.client.util.errorEmbed(msg, 'You have reached the maximum number of reminders.');
    } else if (userReminders.length >= maxReminders && !donatorStatus && level < 8) {
      return this.client.util.errorEmbed(msg, 'You have reached the maximum number of reminders.');
    }

    // Clean the string from the user, and parse the results
    const cleanedArgs = await this.client.util.clean(this.client, args.join(' '));
    const results = chrono.parse(cleanedArgs);

    // Check if the parser correctly understood the input
    if (!results?.[0]?.start) return msg.channel.send('Please provide a valid starting time.');

    // Conversions and dates
    const now = new Date();
    const start = results[0].start.date().getTime();
    const message = cleanedArgs;

    if (start <= now) return msg.channel.send('Please make sure your reminder is not part of Back to the Future.');
    if (isNaN(start) || !isFinite(start)) return msg.channel.send('Please provide a valid starting time.');
    if (message.length > 256) return msg.channel.send('Please keep your reminder under 256 characters.');

    const rand = '000000'.replace(/0/g, function () {
      return (~~(Math.random() * 16)).toString(16);
    });

    const embed = new EmbedBuilder()
      .setColor(rand)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .addFields([{ name: '**I will remind you to:**', value: `\`\`\`${message}\`\`\`` }])
      .setDescription(`**I will remind you on:** \n<t:${Math.floor(start / 1000)}:F>`)
      .setFooter({ text: `ID: ${remID}` });

    const originalMessage = await msg.channel.send({ embeds: [embed] }).catch(() => {});

    const obj = {
      channelID: msg.channel?.id || null,
      createdAt: now.getTime(),
      userID: msg.author.id,
      guildID: msg.guild?.id || null,
      reminder: message,
      triggerOn: start,
      originalMessage,
      color: rand,
      remID,
    };

    await db.set(`global.reminders.${remID}`, obj);
  }
}

module.exports = RemindMe;
