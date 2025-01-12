const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('emoji')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Create, edit, or get information about an emoji')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create an emoji from an image')
      .addStringOption((option) =>
        option
          .setName('createname')
          .setDescription('The name of the emoji to create')
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(32),
      )
      .addStringOption((option) => option.setName('imageurl').setDescription('The url of an image to use as the emoji'))
      .addAttachmentOption((option) =>
        option.setName('attachment').setDescription('An attachment to use instead as the emoji'),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('Delete an emoji')
      .addStringOption((option) =>
        option.setName('emojidelete').setDescription('The emoji to delete').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('info')
      .setDescription('Get information about an emoji')
      .addStringOption((option) =>
        option.setName('infoemoji').setDescription('The emoji to get info on').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('rename')
      .setDescription('Rename an emoji')
      .addStringOption((option) =>
        option.setName('emojitorename').setDescription('The emoji to rename').setRequired(true),
      )
      .addStringOption((option) =>
        option.setName('newname').setDescription('The new name of the emoji').setRequired(true),
      ),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== 'info') {
    if (!interaction.guild.members.me.permissions.has('ManageGuildExpressions')) {
      return interaction.editReply('The bot is missing Manage Expressions permission');
    }
  }

  switch (subcommand) {
    case 'create': {
      const name = interaction.options.getString('createname');
      const image = interaction.options.getAttachment('attachment').url || interaction.options.getString('imageurl');

      if (!image) return interaction.editReply('You need to add an attachment or image url.');

      const emoji = await interaction.guild.emojis.create({ attachment: image, name }).catch((error) => {
        return interaction.editReply(`An error ocurred: ${error}`);
      });
      return interaction.editReply(`${emoji} has been created.`);
    }

    case 'delete': {
      const emoji = interaction.options.getString('emojidelete');
      const result = guildEmoji(interaction, emoji);

      if (!result) return interaction.client.util.errorEmbed(interaction, 'That emoji was not found.');
      if (!result.deletable)
        return interaction.client.util.errorEmbed(interaction, 'That emoji is not deletable by the bot.');

      result.delete();
      return interaction.editReply('The emoji has been successfully deleted.');
    }

    case 'info': {
      const emoji = interaction.options.getString('infoemoji');
      const result = guildEmoji(interaction, emoji);
      if (!result) return interaction.client.util.errorEmbed(interaction, 'That emoji was not found.');
      await result.fetchAuthor();

      const em = new EmbedBuilder()
        .setTitle('Emoji Information')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor(interaction.settings.embedColor)
        .addFields([
          { name: 'Emoji', value: result.toString(), inline: true },
          { name: 'Name', value: result.name, inline: true },
          { name: 'Author', value: result.author?.toString() || 'Unknown', inline: true },
          { name: 'Is Animated?', value: result.animated ? 'True' : 'False', inline: true },
          { name: 'is Available?', value: result.available ? 'True' : 'False', inline: true },
          { name: 'is Deletable?', value: result.deletable ? 'True' : 'False', inline: true },
          { name: 'ID', value: result.id.toString(), inline: true },
          { name: 'Created At', value: result.createdAt.toString() || 'Unknown', inline: true },
        ]);

      return interaction.editReply({ embeds: [em] });
    }

    case 'rename': {
      const emoji = interaction.options.getString('emojitorename');
      const name = interaction.options.getString('newname');
      const result = guildEmoji(interaction, emoji);
      if (!result) return interaction.client.util.errorEmbed(interaction, 'That emoji was not found.');

      result
        .edit({ name })
        .then(() => {
          return interaction.editReply(`${result} has been renamed to \`${name}\``);
        })
        .catch((error) => {
          return interaction.client.util.errorEmbed(interaction, error);
        });
    }
  }

  function guildEmoji(interaction, emoji) {
    let result;

    let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
    if (guildEmojis) {
      guildEmojis = guildEmojis.map((e) => e.substring(1, e.length - 1));
      const guildEmoji = interaction.guild.emojis.cache.get(guildEmojis[0]);
      if (guildEmoji) result = guildEmoji;
    } else {
      const guildEmoji = interaction.guild.emojis.cache.find((e) => e.name === emoji);
      if (guildEmoji) result = guildEmoji;
    }

    return result;
  }
};
