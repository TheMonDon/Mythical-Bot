const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder().setName('reminders').setDescription('View or delete your reminders');

exports.run = async (interaction) => {
  await interaction.deferReply();

  let [userReminders] = await interaction.client.db.execute(
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

  if (userReminders.length === 0) {
    const noReminderMessage = interaction.client.util.errorEmbed(
      interaction,
      `${interaction.user.username}, you don't have any reminders, use the **remindme** command to create a new one!`,
    );

    return interaction.editReply(noReminderMessage);
  }

  let currentPage = 0;
  const pageCount = () => Math.max(1, Math.ceil(userReminders.length / 10));

  // One container per render: reminders for the current page plus the nav buttons.
  const buildContainer = (disabled = false) => {
    currentPage = Math.min(currentPage, pageCount() - 1);

    const container = new ContainerBuilder()
      .setAccentColor(parseInt(interaction.settings.embedColor.slice(1, 7), 16))
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('### Reminders'))
      .addSeparatorComponents((separator) => separator);

    if (userReminders.length === 0) {
      container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('You have no reminders left.'));
      return container;
    }

    userReminders.slice(currentPage * 10, currentPage * 10 + 10).forEach(({ triggerOn, reminderText, reminderID }) => {
      container.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `<t:${Math.floor(triggerOn / 1000)}:R>\n-# ${reminderText.length > 150 ? reminderText.slice(0, 150) + '...' : reminderText}`,
            ),
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(`reminder_${reminderID}`)
              .setLabel('Delete')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(disabled),
          ),
      );
    });

    if (pageCount() > 1) {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || currentPage === pageCount() - 1),
        ),
      );
    }

    return container;
  };

  const message = await interaction.editReply({
    components: [buildContainer()],
    flags: MessageFlags.IsComponentsV2,
  });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = message.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 1800000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.customId === 'prev') {
      currentPage -= 1;
    } else if (btnInteraction.customId === 'next') {
      currentPage += 1;
    } else if (btnInteraction.customId.startsWith('reminder_')) {
      const reminderID = btnInteraction.customId.slice('reminder_'.length);

      await interaction.client.db.execute(
        /* sql */ `
          DELETE FROM reminders
          WHERE
            reminder_id = ?
            AND user_id = ?
        `,
        [reminderID, interaction.user.id],
      );

      userReminders = userReminders.filter((reminder) => String(reminder.reminderID) !== reminderID);
    }

    await btnInteraction.update({ components: [buildContainer()] });
  });

  collector.on('end', () => {
    interaction?.editReply({ components: [buildContainer(true)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  });
};
