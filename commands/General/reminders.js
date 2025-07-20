const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
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

    let reminders = await db.get('global.reminders');
    if (!Array.isArray(reminders)) {
      reminders = Object.values(reminders || {});
    }

    if (!args[0]) {
      const userReminders = reminders.filter((rem) => rem.userID === msg.author.id);
      const pages = [];
      let i = 1;

      while (userReminders.length) {
        const embed = new EmbedBuilder()
          .setTitle(`To delete a reminder, use **\`${msg.settings.prefix}reminders <ID>\`**`)
          .setColor(msg.settings.embedColor)
          .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });

        userReminders.splice(0, 25).forEach(({ triggerOn, reminder, remID }) => {
          const numberEmojiArray = [];

          if (i in numbers) {
            numberEmojiArray.push(numbers[i]);
          } else if (i >= Object.keys(numbers).length) {
            String(i)
              .split('')
              .forEach((digit) => numberEmojiArray.push(numbers[digit]));
          }
          if (numberEmojiArray.join('')?.length < 1) numberEmojiArray.push(i);

          embed.addFields([
            {
              name: `**${numberEmojiArray.join('') + '.'}** I'll remind you ${moment(
                triggerOn,
              ).fromNow()} (ID: ${remID})`,
              value: this.client.util.limitStringLength(reminder, 0, 200),
            },
          ]);
          i += 1;
        });

        pages.push(embed);
      }

      if (pages.length === 0) {
        const noReminderEmbed = new EmbedBuilder()
          .setColor(errorColor)
          .setDescription(
            `${msg.author.username}, you don't have any reminders, use the **remindme** command to create a new one!`,
          );
        return msg.channel.send({ embeds: [noReminderEmbed] });
      }

      let currentPage = 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === pages.length - 1),
      );

      const message = await msg.channel.send({ embeds: [pages[currentPage]], components: [row] });

      const filter = (i) => i.user.id === msg.author.id;
      const collector = message.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
        time: 2147483647,
      });

      collector.on('collect', async (interaction) => {
        if (interaction.customId === 'prev') {
          currentPage -= 1;
        } else if (interaction.customId === 'next') {
          currentPage += 1;
        }

        await interaction.update({
          embeds: [pages[currentPage]],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === pages.length - 1),
            ),
          ],
        });
      });

      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
        );
        message.edit({ components: [disabledRow] });
      });

      return;
    }

    const ID = args[0];
    const reminder = await db.get(`global.reminders.${ID}`);

    const em = new EmbedBuilder();

    if (!ID || !reminder || reminder.userID !== msg.author.id) {
      em.setColor(errorColor).setDescription(`${msg.author.username}, that isn't a valid reminder.`);
    } else {
      await db.delete(`global.reminders.${ID}`);
      em.setColor(msg.settings.embedSuccessColor).setDescription(
        `${msg.author.username}, you've successfully deleted your reminder.`,
      );
    }

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Reminders;
