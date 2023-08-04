const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class Reminders extends Command {
  constructor(client) {
    super(client, {
      name: 'reminders',
      description: 'View your reminders',
      usage: 'reminders [ID]',
      category: 'General',
    });
  }

  async run(msg, args) {
    const emoji = {
      0: '0⃣',
      1: '1⃣',
      2: '2⃣',
      3: '3⃣',
      4: '4⃣',
      5: '5⃣',
      6: '6⃣',
      7: '7⃣',
      8: '8⃣',
      9: '9⃣',
      10: '🔟',
    };
    const numbers = [
      emoji[0],
      emoji[1],
      emoji[2],
      emoji[3],
      emoji[4],
      emoji[5],
      emoji[6],
      emoji[7],
      emoji[8],
      emoji[9],
      emoji[10],
    ];
    const errorColor = msg.settings.embedErrorColor;

    const em = new EmbedBuilder();
    const reminders = (await db.get('global.reminders')) || [];

    if (!args[0]) {
      let i = 1;
      for (const { triggerOn, reminder, userID, remID } of Object.values(reminders)) {
        if (userID === msg.author.id) {
          em.addFields([
            {
              name: `**${numbers[i] || i + '.'}** I'll remind you ${moment(triggerOn).fromNow()} (ID: ${remID})`,
              value: reminder.slice(0, 200),
            },
          ]);
          i += 1;
        }
      }

      em.setTitle(`To delete a reminder, use **\`${msg.settings.prefix}reminders <ID>\`**`);

      if (em?.data?.fields?.length !== 0) {
        em.setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });
      } else {
        em.setDescription(
          `${msg.author.username}, you don't have any reminders, use the **remindme** command to create a new one!`,
        );
      }
      em.setColor(msg.settings.embedColor);

      return msg.channel.send({ embeds: [em] });
    }

    const ID = args[0];
    const reminder = await db.get(`global.reminders.${ID}`);

    if (!ID) {
      em.setColor(errorColor);
      em.setDescription(`${msg.author.username}, that isn't a valid reminder.`);
    } else if (!reminder || reminder.userID !== msg.author.id) {
      em.setColor(errorColor);
      em.setDescription(`${msg.author.username}, that isn't a valid reminder.`);
    } else {
      await db.delete(`global.reminders.${ID}`);

      em.setColor(msg.settings.embedSuccessColor);
      em.setDescription(`${msg.member.displayName}, you've successfully deleted your reminder.`);
    }
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Reminders;
