const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
require('moment-duration-format');
const moment = require('moment');

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
    const connection = await this.client.db.getConnection();

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

    if (!args[0]) {
      const [userReminders] = await connection.execute(
        /* sql */ `
          SELECT
            reminder_id AS reminderID,
            reminder_text AS reminderText,
            trigger_on AS triggerOn
          FROM
            reminders
          WHERE
            user_id = ?
          ORDER BY
            created_at ASC
        `,
        [msg.author.id],
      );
      connection.release();

      const pages = [];
      let i = 1;

      while (userReminders.length) {
        const embed = new EmbedBuilder()
          .setTitle(`To delete a reminder, use **\`${msg.settings.prefix}reminders <ID>\`**`)
          .setColor(msg.settings.embedColor)
          .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() });

        userReminders.splice(0, 25).forEach(({ triggerOn, reminderText, reminderID }) => {
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
              ).fromNow()} (ID: ${reminderID})`,
              value: this.client.util.limitStringLength(reminderText, 0, 200),
            },
          ]);
          i += 1;
        });

        pages.push(embed);
      }

      if (pages.length === 0) {
        const noReminderEmbed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
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

    const remID = args[0];
    if (!remID) {
      return this.client.util.errorEmbed(msg, `Please input a valid reminder ID.`, 'Invalid Args');
    }

    const [result] = await connection.execute(
      /* sql */ `
        DELETE FROM reminders
        WHERE
          reminder_id = ?
          AND user_id = ?
      `,
      [remID, msg.author.id],
    );
    connection.release();

    if (result.affectedRows === 0) {
      return this.client.util.errorEmbed(msg, `A reminder with the ID \`${remID}\` was not found.`);
    }

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setDescription(`${msg.author.username}, you've successfully deleted your reminder.`);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Reminders;
