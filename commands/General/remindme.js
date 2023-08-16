const { EmbedBuilder, ChannelType } = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const sherlock = require('sherlockjs');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class RemindMe extends Command {
  constructor(client) {
    super(client, {
      name: 'remind-me',
      description: 'Gives you a reminder',
      examples: ['remind-me Ban Zeph in 1 year', 'remind-me in 4 months '],
      usage: 'remind-me <reminder>',
      requiredArgs: 1,
      category: 'General',
      aliases: ['remind', 'remindme'],
    });
  }

  async run(msg, args) {
    const reminders = (await db.get('global.reminders')) || [];
    let remID = this.client.util.randomString(5);
    while (reminders.length > 0 && reminders.includes(remID)) remID = this.client.util.randomString(5);

    /* this is all old.
    // Want to find a way to put this back in at some point.

    const numReminders = reminders.length;

    let maxReminders = 2;
    const usertype = await db.get(`users.${msg.author.id}.usertype`) || 0;
    if (usertype === 10) { // Developer.
      maxReminders = 20;
    } else if (usertype === 1) { // Donators?
      maxReminders = 4;
    }

    if (numReminders >= maxReminders) return msg.channel.send(`Sorry ${msg.author.username}, but you already have ${numReminders} reminders active. Please wait for that to finish, or you can donate to raise your cap.`);
    */

    const reminder = sherlock.parse(args.join(' '));
    if (!reminder.startDate) return msg.channel.send('Please provide a valid starting time.');
    if (!reminder.eventTitle) return msg.channel.send('Please provide a valid reminder');

    const now = new Date();
    const start = reminder.startDate.getTime();
    const message = reminder.eventTitle;

    const startTime = moment(start);
    const now1 = moment();
    const timeString = moment.duration(startTime.diff(now1)).format();

    if (start <= now) return msg.channel.send('Please make sure your reminder is not part of back to the future.');
    if (message.length > 200) return msg.channel.send('Please keep your reminder under 200 characters.');
    if (isNaN(start) || !isFinite(start)) return msg.channel.send('Please provide a valid starting time.');

    const rand = '000000'.replace(/0/g, function () {
      return (~~(Math.random() * 16)).toString(16);
    });

    const embed = new EmbedBuilder()
      .setColor(rand)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'I will remind you to:', value: `\`\`\`${message}\`\`\`` },
        { name: 'in:', value: `\`\`\`${timeString}\`\`\`` },
      ])
      .setFooter({ text: `ID: ${remID} | Got it! I'll remind you on:` })
      .setTimestamp(start);
    msg.channel.send({ embeds: [embed] });

    const obj = {
      createdAt: now.getTime(),
      triggerOn: start,
      reminder: message,
      channelID: msg.channel.type === ChannelType.DM ? null : msg.channel.id,
      userID: msg.author.id,
      color: rand,
      remID,
    };

    await db.set(`global.reminders.${remID}`, obj);
  }
}

module.exports = RemindMe;
