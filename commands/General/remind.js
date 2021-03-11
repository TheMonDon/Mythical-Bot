const Command = require('../../base/Command.js');
const { findWithAttr } = require('../../base/Util.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');
const sherlock = require('sherlockjs');

class Remind extends Command {
  constructor (client) {
    super(client, {
      name: 'reminder',
      description: 'Gives you a reminder',
      usage: 'reminder <reminder>',
      category: 'General',
      aliases: ['remindme', 'remind', 'remind-me'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const p = msg.settings.prefix;
    const query = args.join(' ');
    const _this = this;
    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${p}Remind <reminder> \nExample: ${p}Remind Ban GPM in 24 hours`);

    let reminders = db.get(`users.${msg.member.id}.timers.remindme`) || [];
    reminders = reminders.filter(a => !a.disabled);
    reminders = reminders.filter(a => !a.completed);
    const obj = {};
    const numReminders = reminders.length;
    let maxReminders = 2;
    const usertype = db.get(`users.${msg.member.id}.usertype`) || 0;
    if (usertype === 10) { // Developer.
      maxReminders = 20;
    } else if (usertype === 2) { // Gladiator?
      maxReminders = 5;
    } else if (usertype === 1) { // VIP?
      maxReminders = 3;
    }

    if (numReminders >= maxReminders) return msg.channel.send(`Sorry ${msg.member.displayName}, but you already have ${numReminders} reminders active. Please wait for that to finish, or you can donate to raise your cap.`);

    const reminder = sherlock.parse(query);
    if (!reminder.startDate) return msg.channel.send('Please provide a valid starting time.');
    if (!reminder.eventTitle) return msg.channel.send('Please provide a valid reminder');

    const timer = reminder.startDate.getTime() - Date.now();
    if (timer > 2073600000) return msg.channel.send('Please provide a valid time. Max time is 24 days.');

    const rand = '000000'.replace(/0/g, function () {
      return (~~(Math.random() * 16)).toString(16);
    });

    const start = reminder.startDate.getTime();
    const mes = reminder.eventTitle;
    const timeString = moment(reminder.startDate.getTime()).fromNow(true);
    const timeNum = start - Date.now();

    const remindEmbed = new DiscordJS.MessageEmbed()
      .setColor(rand)
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .addField('I will remind you to:', `\`\`\`${mes}\`\`\``, true)
      .addField('in:', `\`\`\`${timeString}\`\`\``, true)
      .setFooter('Got it! I\'ll remind you on:')
      .setTimestamp(start);

    const createdTime = Date.now();
    msg.channel.send(remindEmbed);
    obj.createdAtTimestamp = createdTime;
    obj.remindingTimestamp = start;
    obj.timeInput = timeString;
    obj.message = mes;
    obj.serverID = msg.guild.id;
    obj.serverName = msg.guild.name;
    obj.channelID = msg.channel.id;
    obj.id = msg.id;
    obj.username = msg.member.displayName;
    obj.avatarURL = msg.author.displayAvatarURL();
    obj.userID = msg.author.id;
    obj.color = rand;
    obj.disabled = false; // obj.disabled is to check if user cancelled that reminder. (Future feature).
    obj.completed = false; // maybe put this here idk if itll work
    reminders.push(obj);
    db.set(`users.${msg.member.id}.timers.remindme`, reminders);

    setTimeout(function () {
      const remindEmbed = new DiscordJS.MessageEmbed()
        .setColor(rand)
        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
        .addField('Reminder', `\`\`\`${(mes.length > 1020) ? mes.substring(0, 1997) + '...' : mes}\`\`\``)
        .setFooter('You requested this reminder on')
        .setTimestamp(createdTime);

      reminders = db.get(`users.${msg.member.id}.timers.remindme`) || []; // gets the current list.
      const pos = findWithAttr(reminders, 'id', msg.id); // Finds the reminder to delete from the list since we successfully sent the reminder.
      const isDisabled = reminders[pos].disabled;
      const isCompleted = reminders[pos].completed;

      if (isDisabled || isCompleted) {
        reminders = db.get(`users.${msg.member.id}.timers.remindme`) || [];
        reminders = reminders.filter(Boolean); // removes deleted entries (null entries);
        delete reminders[pos]; // removes the reminder, and replaces it with < empty item >
        reminders = reminders.filter(Boolean); // removes deleted entries (null entries);
        // c('reminders after the delete: '+j(reminders));
        db.set(`users.${msg.member.id}.timers.remindme`, reminders); // Sets the reminders list back.
      } else {
        const chan = _this.client.channels.cache.get(String(msg.channel.id));
        if (chan) { // ensures the channel hasn't been deleted.
          reminders = db.get(`users.${msg.member.id}.timers.remindme`) || []; // gets the current list.
          const pos = findWithAttr(reminders, 'id', msg.id); // Finds the reminder to delete from the list since we successfully sent the reminder.
          // c('pos is: '+pos);
          // c('reminders before the delete: '+j(reminders));
          delete reminders[pos]; // removes the reminder, and replaces it with < empty item >
          reminders = reminders.filter(Boolean); // removes deleted entries (null entries);
          // c('reminders after the delete: '+j(reminders));

          db.set(`users.${msg.member.id}.timers.remindme`, reminders); // Sets the reminders list back.

          return msg.channel.send(`Here's your reminder ${msg.author}`, remindEmbed);
        } else { // try to DM user if the channel has been deleted.
          try { // check if user exists
            reminders = db.get(`users.${msg.member.id}.timers.remindme`) || []; // gets the current list.
            const pos = findWithAttr(reminders, 'id', msg.id); // Finds the reminder to delete from the list since we successfully sent the reminder.
            // c('pos is: '+pos);
            // c('reminders before the delete: '+j(reminders));
            delete reminders[pos]; // removes the reminder, and replaces it with < empty item >
            reminders = reminders.filter(Boolean); // removes deleted entries (null entries);

            // c('reminders after the delete: '+j(reminders));
            db.set(`users.${msg.member.id}.timers.remindme`, reminders); // Sets the reminders list back.

            return _this.client.users.cache.get(String(msg.member.id))
              .send(`${msg.member.displayName}, here's your reminder:`, remindEmbed)
              .catch(() => null);
          } catch (err) {
            // do nothing.
          }
        }
      }

      // delete obj[index].timers.remindme[nums];
    }, timeNum);
  }
}

module.exports = Remind;
