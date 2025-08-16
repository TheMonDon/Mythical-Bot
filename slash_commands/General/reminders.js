const {
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const moment = require('moment');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('reminders')
  .setDescription('View or delete your reminders')
  .addStringOption((option) => option.setName('reminder_id').setDescription('The reminder to delete'));

exports.run = async (interaction) => {
  await interaction.deferReply();
  const connection = await interaction.client.db.getConnection();

  const reminderID = interaction.options.getString('reminder_id');

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

  if (!reminderID) {
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
      [interaction.user.id],
    );
    connection.release();

    const pages = [];
    let i = 1;

    while (userReminders.length) {
      const embed = new EmbedBuilder()
        .setTitle(`To delete a reminder, use **\`/reminders <ID>\`**`)
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

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
            value: reminderText.slice(0, 200),
          },
        ]);
        i += 1;
      });

      pages.push(embed);
    }

    if (pages.length === 0) {
      const noReminderEmbed = new EmbedBuilder()
        .setColor(interaction.settings.embedErrorColor)
        .setDescription(
          `${interaction.user.username}, you don't have any reminders, use the **remindme** command to create a new one!`,
        );
      return interaction.editReply({ embeds: [noReminderEmbed] });
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

    const message = await interaction.editReply({ embeds: [pages[currentPage]], components: [row] });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: 2147483647,
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId === 'prev') {
        currentPage -= 1;
      } else if (btnInteraction.customId === 'next') {
        currentPage += 1;
      }

      await btnInteraction.update({
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
      interaction.editReply({ components: [disabledRow] });
    });

    return;
  }

  if (!reminderID) {
    return interaction.client.util.errorEmbed(interaction, `Please input a valid reminder ID.`, 'Invalid Args');
  }

  const [result] = await connection.execute(
    /* sql */ `
      DELETE FROM reminders
      WHERE
        reminder_id = ?
        AND user_id = ?
    `,
    [reminderID, interaction.user.id],
  );
  connection.release();

  if (result.affectedRows === 0) {
    return interaction.client.util.errorEmbed(interaction, `A reminder with the ID \`${reminderID}\` was not found.`);
  }

  const em = new EmbedBuilder()
    .setColor(interaction.settings.embedSuccessColor)
    .setDescription(`${interaction.user.username}, you've successfully deleted your reminder.`);

  return interaction.editReply({ embeds: [em] });
};
