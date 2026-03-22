const Command = require('../../base/Command.js');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  LabelBuilder,
  TextInputStyle,
  ComponentType,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  RoleSelectMenuBuilder,
} = require('discord.js');
const ms = require('ms');

class StartGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'start-giveaway',
      description: 'Start a giveaway',
      usage: 'start-giveaway',
      category: 'Giveaways',
      aliases: ['startgiveaway', 'creategiveaway', 'create-giveaway'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg) {
    await msg.delete().catch(() => null);

    const setupEmbed = new EmbedBuilder()
      .setTitle('🎁 Giveaway Setup')
      .setDescription('Click the buttons below to configure your giveaway.')
      .addFields(
        { name: 'Step 1', value: 'Fill out the Basic Information' },
        { name: 'Step 2 (Optional)', value: 'Configure Advanced Settings' },
      )
      .setColor(msg.settings.embedColor);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gw_modal_basic').setLabel('Basic Info').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('gw_modal_advanced')
        .setLabel('Advanced Settings')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('gw_launch').setLabel('Launch Giveaway').setStyle(ButtonStyle.Success),
    );

    const setupMsg = await msg.channel.send({ embeds: [setupEmbed], components: [row] });
    const collector = setupMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

    const giveawayData = {
      basicInfo: false,
      prize: null,
      winnerCount: null,
      duration: null,
      channel: null,
      description: null,
      requiredRole: null,
      pingRole: null,
      host: msg.author.id,
      thumbnailURL: null,
    };

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({
          content: 'Only the giveaway creator can configure this giveaway.',
          ephemeral: true,
        });
      }

      switch (interaction.customId) {
        case 'gw_modal_basic': {
          const modal = new ModalBuilder().setCustomId('basic_modal').setTitle('Giveaway Basic Information');

          const prizeLabel = new LabelBuilder()
            .setLabel('What are you giving away?')
            .setTextInputComponent(
              new TextInputBuilder()
                .setMinLength(1)
                .setMaxLength(255)
                .setCustomId('prizeInput')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            );

          const winnersLabel = new LabelBuilder()
            .setLabel('How many winners will there be?')
            .setTextInputComponent(
              new TextInputBuilder()
                .setMinLength(1)
                .setMaxLength(2)
                .setCustomId('winnersInput')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            );

          const durationLabel = new LabelBuilder()
            .setLabel('How long will the giveaway last?')
            .setTextInputComponent(
              new TextInputBuilder()
                .setMinLength(1)
                .setMaxLength(10)
                .setCustomId('durationInput')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            );

          const channelLabel = new LabelBuilder()
            .setLabel('Where should the giveaway be hosted?')
            .setChannelSelectMenuComponent(
              new ChannelSelectMenuBuilder({
                custom_id: 'channelInput',
                placeholder: 'Select an option',
                min_values: 1,
                max_values: 1,
              }).setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
            );

          modal.addLabelComponents(prizeLabel, winnersLabel, durationLabel, channelLabel);

          await interaction.showModal(modal);

          // Get the Modal Submit Interaction that is emitted once the User submits the Modal
          const submitted = await interaction
            .awaitModalSubmit({
              // Timeout after two minutes of not receiving any valid Modals
              time: 120000,
              // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
              filter: (i) => i.user.id === interaction.user.id,
            })
            .catch((error) => {
              // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 120000 ms)
              console.error(error);
              return null;
            });

          if (!submitted) {
            return interaction.followUp({
              content: 'You did not submit the modal in time!',
              flags: MessageFlags.Ephemeral,
            });
          }

          const prize = submitted.fields.getTextInputValue('prizeInput');
          const winnerCount = submitted.fields.getTextInputValue('winnersInput');
          const durationStr = submitted.fields.getTextInputValue('durationInput');
          const channel = submitted.fields.getSelectedChannels('channelInput').first();

          const durationMs = ms(durationStr);
          if (!durationMs) {
            return submitted.reply({
              content: 'Invalid duration format. Please use something like "1h", "30m", or "2d".',
              flags: MessageFlags.Ephemeral,
            });
          }

          giveawayData.prize = prize;
          giveawayData.winnerCount = parseInt(winnerCount);
          giveawayData.duration = durationMs;
          giveawayData.channel = channel.id;
          giveawayData.basicInfo = true;

          await submitted.reply({ content: 'Basic information saved!', flags: MessageFlags.Ephemeral });

          break;
        }

        case 'gw_modal_advanced': {
          const modal = new ModalBuilder().setCustomId('advanced_modal').setTitle('Giveaway Advanced Settings');
          const descriptionLabel = new LabelBuilder()
            .setLabel('Giveaway Description')
            .setTextInputComponent(
              new TextInputBuilder()
                .setMinLength(0)
                .setMaxLength(1000)
                .setCustomId('descriptionInput')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false),
            );

          const requiredRoleLabel = new LabelBuilder().setLabel('Required Role').setRoleSelectMenuComponent(
            new RoleSelectMenuBuilder({
              custom_id: 'requiredRoleInput',
              placeholder: 'Select a role (optional)',
              min_values: 0,
              max_values: 1,
              required: false,
            }),
          );

          const pingRoleLabel = new LabelBuilder().setLabel('Ping Role').setRoleSelectMenuComponent(
            new RoleSelectMenuBuilder({
              custom_id: 'pingRoleInput',
              placeholder: 'Select a role (optional)',
              min_values: 0,
              max_values: 1,
              required: false,
            }),
          );

          const thumbnailLabel = new LabelBuilder()
            .setLabel('Thumbnail URL (Optional)')
            .setTextInputComponent(
              new TextInputBuilder()
                .setMinLength(0)
                .setMaxLength(2000)
                .setCustomId('thumbnailInput')
                .setStyle(TextInputStyle.Short)
                .setRequired(false),
            );

          modal.addLabelComponents(descriptionLabel, requiredRoleLabel, pingRoleLabel, thumbnailLabel);

          await interaction.showModal(modal);

          const submitted = await interaction
            .awaitModalSubmit({
              time: 300000,
              filter: (i) => i.user.id === interaction.user.id,
            })
            .catch((error) => {
              console.error(error);
              return null;
            });

          if (!submitted) {
            return interaction.followUp({
              content: 'You did not submit the modal in time!',
              flags: MessageFlags.Ephemeral,
            });
          }

          const description = submitted.fields.getTextInputValue('descriptionInput');
          const requiredRole = submitted.fields.getSelectedRoles('requiredRoleInput').first();
          const pingRole = submitted.fields.getSelectedRoles('pingRoleInput').first();
          const thumbnailURL = submitted.fields.getTextInputValue('thumbnailInput');

          giveawayData.description = description || null;
          giveawayData.requiredRole = requiredRole?.id || null;
          giveawayData.pingRole = pingRole?.id || null;
          giveawayData.thumbnailURL = thumbnailURL || null;

          await submitted.reply({ content: 'Advanced settings saved!', flags: MessageFlags.Ephemeral });
          break;
        }

        case 'gw_launch': {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          // Validate giveawayData and launch giveaway
          if (!giveawayData.basicInfo) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please fill out the basic information before launching the giveaway.',
              'Basic Information Required',
            );
          }

          if (isNaN(giveawayData.winnerCount)) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Winner amount is not a number',
              'Invalid Winner Count',
            );
          }

          if (giveawayData.winnerCount < 1) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Giveaways must have at least 1 winner.',
              'Invalid Winner Count',
            );
          } else if (giveawayData.winnerCount > 40) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Giveaways cannot have more than 40 winners.',
              'Invalid Winner Count',
            );
          }

          if (isNaN(giveawayData.duration)) {
            return interaction.client.util.errorEmbed(interaction, 'Duration is not a number', 'Invalid Duration');
          }

          if (giveawayData.duration < 60000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Giveaways must be at least 1 minute long.',
              'Invalid Duration',
            );
          } else if (giveawayData.duration > 2419200000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Giveaways cannot be longer than 4 weeks (28d)',
              'Invalid Duration',
            );
          }

          const channel = await interaction.client.channels.fetch(giveawayData.channel);
          if (!channel) {
            return interaction.client.util.errorEmbed(
              interaction,
              interaction.client.settings.prefix + this.help.conf,
              'Invalid Channel',
            );
          }

          // Start the giveaway
          const endAt = Date.now() + giveawayData.duration;
          const unixEnd = Math.floor(endAt / 1000);

          const embed = new EmbedBuilder()
            .setTitle(giveawayData.prize)
            .setDescription(giveawayData.description)
            .setColor(msg.settings.embedColor)
            .addFields([
              {
                name: '🎁 Giveaway Information',
                value: `**Drawing:** <t:${unixEnd}:R>\n**Hosted by:** <@${giveawayData.host}>${giveawayData.requiredRole ? `\n**Required Role:** <@&${giveawayData.requiredRole}>` : ''}`,
              },
            ])
            .setFooter({ text: `Winners: ${giveawayData.winnerCount}` })
            .setTimestamp(endAt);

          if (giveawayData.thumbnailURL) {
            embed.setThumbnail(giveawayData.thumbnailURL);
          }

          const enterButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('giveaway_enter')
              .setLabel('Enter (0)')
              .setEmoji('🎉')
              .setStyle(ButtonStyle.Primary),
          );

          const sentMsg = await channel.send({
            content: giveawayData.pingRole ? `<@&${giveawayData.pingRole}>` : undefined,
            embeds: [embed],
            components: [enterButton],
          });

          // Save to Database
          await this.client.db.execute(
            /* sql */
            `
              INSERT INTO
                giveaways (
                  message_id,
                  channel_id,
                  server_id,
                  required_role,
                  prize,
                  winner_count,
                  started_at,
                  end_at,
                  host_id
                )
              VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              sentMsg.id,
              channel.id,
              msg.guild.id,
              giveawayData.requiredRole ? giveawayData.requiredRole : null,
              giveawayData.prize,
              giveawayData.winnerCount,
              Date.now(),
              endAt,
              giveawayData.host,
            ],
          );

          const startedEmbed = new EmbedBuilder()
            .setTitle('Giveaway Created!')
            .setDescription(`Your giveaway for **${giveawayData.prize}** has been created in ${channel}`)
            .setColor(msg.settings.embedSuccessColor)
            .setTimestamp();

          const viewButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('View Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Link).setURL(sentMsg.url),
          );

          return interaction.editReply({ embeds: [startedEmbed], components: [viewButton] });
        }
      }
    });

    collector.on('end', async () => {
      const expiredEmbed = new EmbedBuilder()
        .setTitle('Giveaway Setup Expired')
        .setDescription('The giveaway setup has expired. Please run the command again to start a new giveaway.')
        .setColor(msg.settings.embedErrorColor)
        .setFooter({ text: 'Self destructing in 2 minutes.' })
        .setTimestamp();

      const reply = await setupMsg.edit({ embeds: [expiredEmbed], components: [] });
      setTimeout(() => reply.delete(), 120000);
    });
  }
}

module.exports = StartGiveaway;
