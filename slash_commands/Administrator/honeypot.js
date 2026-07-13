const {
  SlashCommandBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  RadioGroupBuilder,
} = require('discord.js');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('honeypot')
  .setDescription('Setup the honeypot channel and its settings');

exports.run = async (interaction) => {
  try {
    const [honeyRows] = await interaction.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          honeypots
        WHERE
          server_id = ?
      `,
      [interaction.guild.id],
    );

    const existingConfig = honeyRows[0];
    const action = existingConfig?.action;
    const existingOptions = (() => {
      if (Array.isArray(existingConfig?.options)) return existingConfig.options;
      if (typeof existingConfig?.options === 'string') {
        try {
          const parsed = JSON.parse(existingConfig.options);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    })();

    const modal = new ModalBuilder().setCustomId('honeypot').setTitle('Honeypot Config');

    const honeypotChannelInput = new ChannelSelectMenuBuilder()
      .setCustomId('honeypot_channel')
      .setPlaceholder('#honeypot')
      .setMinValues(1)
      .setMaxValues(1)
      .addChannelTypes(ChannelType.GuildText);

    const honeypotChannelLabel = new LabelBuilder()
      .setLabel('Honeypot Channel')
      .setDescription('Any message sent in this channel will cause the author to be kicked/banned from server')
      .setChannelSelectMenuComponent(honeypotChannelInput);

    const logChannelInput = new ChannelSelectMenuBuilder()
      .setCustomId('honeypot_log_channel')
      .setRequired(false)
      .setPlaceholder('#mod-log')
      .setMinValues(0)
      .setMaxValues(1)
      .addChannelTypes(ChannelType.GuildText);

    const logChannelLabel = new LabelBuilder()
      .setLabel('Log Channel')
      .setDescription('The channel to log events (ie kicks/bans that the bot actioned)')
      .setChannelSelectMenuComponent(logChannelInput);

    const actionRadioGroup = new RadioGroupBuilder()
      .setCustomId('honeypot_action')
      .setRequired(true)
      .addOptions([
        {
          label: 'Softban (kick)',
          value: 'softban',
          description: 'Bans & unbans to delete last 1hr of messages',
          default: action === 'softban' || !action,
        },
        {
          label: 'Ban',
          value: 'ban',
          description: 'Permanently bans the user to also delete last 1hr of messages',
          default: action === 'ban',
        },
        { label: 'Disabled', value: 'disabled', description: "Don't do anything", default: action === 'disabled' },
      ]);

    const actionLabel = new LabelBuilder()
      .setLabel('What should the bot do to message author?')
      .setRadioGroupComponent(actionRadioGroup);

    const optionsSelect = new StringSelectMenuBuilder()
      .setCustomId('honeypot_options')
      .setPlaceholder('Select options to enable')
      .setRequired(false)
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('No DM')
          .setDescription("Don't DM the user that triggered the honeypot")
          .setValue('no-dm')
          .setDefault(existingOptions.includes('no-dm')),
        new StringSelectMenuOptionBuilder()
          .setLabel('Timeout First')
          .setDescription('Timeout users (for 1hr) to limit activity on rejoin')
          .setValue('timeout-first')
          .setDefault(existingOptions.includes('timeout-first')),
        new StringSelectMenuOptionBuilder()
          .setLabel('Reinvite')
          .setDescription('In the DM message give an invite code to rejoin')
          .setValue('reinvite')
          .setDefault(existingOptions.includes('reinvite')),
        new StringSelectMenuOptionBuilder()
          .setLabel('Random Channel Name')
          .setDescription('Randomize the channel name (every day)')
          .setValue('random-channel-name')
          .setDefault(existingOptions.includes('random-channel-name')),
        new StringSelectMenuOptionBuilder()
          .setLabel('Random Channel Name (Chaos)')
          .setDescription('Randomize the channel name with random characters (every day)')
          .setValue('random-channel-name-chaos')
          .setDefault(existingOptions.includes('random-channel-name-chaos')),
        new StringSelectMenuOptionBuilder()
          .setLabel('No Warning Message')
          .setDescription(
            "Don't include the warning message in the honeypot channel (deletes current one if already present)",
          )
          .setValue('no-warning-message')
          .setDefault(existingOptions.includes('no-warning-message')),
      );

    const optionsLabel = new LabelBuilder().setLabel('Options').setStringSelectMenuComponent(optionsSelect);

    modal.addLabelComponents(honeypotChannelLabel, logChannelLabel, actionLabel, optionsLabel);

    await interaction.showModal(modal);
  } catch (err) {
    console.log(err);
  }
};
