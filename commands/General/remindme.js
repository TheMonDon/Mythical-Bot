const Command = require('../../base/Command.js');
const { randomString } = require('../../base/Util.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');
const sherlock = require('sherlockjs');

class RemindMe extends Command {
  constructor (client) {
    super(client, {
      name: 'remindme',
      description: 'Gives you a reminder',
      usage: 'remindme <reminder>',
      category: 'General',
      aliases: ['remind', 'remind-me', 'rememberforme'],
    });
  }

  async run (msg, args) {
    const p = msg.settings.prefix;
    const query = args.join(' ');

    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${p}Remindme <reminder> \nExample: ${p}Remindme Ban Zeph in 1 year`);

    const reminders = db.get('global.reminders') || [];
    let remID = randomString(5);
    while (reminders.length > 0 && reminders.includes(remID)) remID = randomString(5);

    /* this is all old.
    // Want to find a way to put this back in at some point.

    const numReminders = reminders.length;

    let maxReminders = 2;
    const usertype = db.get(`users.${msg.author.id}.usertype`) || 0;
    if (usertype === 10) { // Developer.
      maxReminders = 20;
    } else if (usertype === 1) { // Donators?
      maxReminders = 4;
    }

    if (numReminders >= maxReminders) return msg.channel.send(`Sorry ${msg.author.username}, but you already have ${numReminders} reminders active. Please wait for that to finish, or you can donate to raise your cap.`);
    */

    const reminder = sherlock.parse(query);
    if (!reminder.startDate) return msg.channel.send('Please provide a valid starting time.');
    if (!reminder.eventTitle) return msg.channel.send('Please provide a valid reminder');

    const now = new Date();
    const start = reminder.startDate.getTime();
    const message = reminder.eventTitle;
    const timeString = moment(reminder.startDate.getTime()).fromNow(true);

    if (start <= now) return msg.channel.send('Please make sure your reminder is not part of back to the future.');

    const rand = '000000'.replace(/0/g, function () {
      return (~~(Math.random() * 16)).toString(16);
    });

    const remindEmbed = new DiscordJS.MessageEmbed()
      .setColor(rand)
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .addField('I will remind you to:', `\`\`\`${message}\`\`\``, true)
      .addField('in:', `\`\`\`${timeString}\`\`\``, true)
      .setFooter('Got it! I\'ll remind you on:')
      .setTimestamp(start);
    msg.channel.send(remindEmbed);

    const obj = {
      createdAt: now.getTime(),
      triggerOn: start,
      reminder: message,
      channelID: msg.channel.type === 'dm' ? null : msg.channel.id,
      userID: msg.author.id,
      color: rand,
      remID
    };

    db.set(`global.reminders.${remID}`, obj);
  }
}

module.exports = RemindMe;
