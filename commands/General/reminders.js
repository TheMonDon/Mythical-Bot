const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');

class Reminders extends Command {
  constructor (client) {
    super(client, {
      name: 'reminders',
      description: 'View your reminders',
      usage: 'reminders [number]',
      category: 'General',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const emoji = {
      0: '0⃣', 1: '1⃣', 2: '2⃣', 3: '3⃣', 4: '4⃣', 5: '5⃣', 6: '6⃣', 7: '7⃣', 8: '8⃣', 9: '9⃣', 10: '🔟'
    };

    const em = new DiscordJS.MessageEmbed();
    let reminders = db.get(`users.${msg.member.id}.timers.remindme`) || [];

    const numbers = [emoji[1], emoji[2], emoji[3], emoji[4], emoji[5], emoji[6], emoji[7], emoji[8], emoji[9], emoji[10]];

    if (!args[0]) {
      reminders = reminders.filter(Boolean);

      for (let i = 0; i < reminders.length; i++) {
        if (!reminders[i].disabled && reminders[i].remindingTimestamp > Date.now()) { // if reminder has NOT been disabled, show it.
          em.addField(`${numbers[i]} I'll remind you ${moment(reminders[i].remindingTimestamp).fromNow()}`, reminders[i].message);
        }
      }

      em.setTitle(`To delete a reminder, use **\`${msg.settings.prefix}reminders <number>\`**`);

      if ((em.fields.length !== 0)) {
        em.setAuthor(reminders[0].username, reminders[0].avatarURL);
      } else {
        em.setDescription(`${msg.member.displayName}, you don't have any reminders, use the **remindme** command to create a new one!`);
      }
      em.setColor('#0099CC');
    } else { // user provided a number
      const num = parseInt(args[0]);

      const list = [];
      for (let i = 0; i < reminders.length; i++) {
        list.push(reminders[i].message);
      }

      if (!num || (!!list[num - 1] === false)) {
        em.setColor('ORANGE');
        em.setDescription(`${msg.member.displayName}, that wasn't a valid reminder.`);
      } else {
        reminders[num - 1].disabled = true;

        db.set(`users.${msg.member.id}.timers.remindme`, reminders);

        em.setColor('GREEN');
        em.setDescription(`${msg.member.displayName}, you've successfully deleted your reminder! You now have ${((list.length - 1) === 1) ? (list.length - 1) + ' reminder' : (list.length - 1) + ' reminders'} left.`);
      }
    }

    return msg.channel.send(em);
  }
}

module.exports = Reminders;
