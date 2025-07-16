const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const { v4: uuidv4 } = require('uuid');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('playlist')
  .setDescription('Save, load, or view your playlists')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('The playlist you want to delete')
      .addStringOption((option) =>
        option
          .setName('playlist')
          .setDescription('The playlist you want to load')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('list')
      .setDescription('Lists your playlists')
      .addIntegerOption((option) => option.setName('page').setDescription('The page to view')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('load')
      .setDescription('Load a playlist')
      .addStringOption((option) =>
        option
          .setName('playlist')
          .setDescription('The playlist you want to load')
          .setRequired(true)
          .setAutocomplete(true)
          .setMinLength(1)
          .setMaxLength(50),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('save')
      .setDescription('Save the queue to a playlist')
      .addStringOption((option) =>
        option
          .setName('playlist')
          .setDescription('The name of the playlist you want to save')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(50),
      ),
  );

exports.autoComplete = async (interaction) => {
  try {
    const input = interaction.options.getString('playlist') || ''; // Get user input
    const userPlaylists = await db.get(`users.${interaction.user.id}.playlists`);

    if (!userPlaylists || userPlaylists.length === 0) {
      // No playlists found, respond with an empty array
      return interaction.respond([]).catch(() => {});
    }

    // Filter playlists based on user input
    const results = userPlaylists
      .filter((playlist) => playlist.name.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 25) // Limit results to 25 to comply with Discord API
      .map((playlist) => ({
        name: playlist.name,
        value: playlist.name, // Use the playlist name as the value
      }));

    // Respond with filtered results
    return interaction.respond(results).catch(() => {});
  } catch (error) {
    console.error('Error in autocomplete:', error);
    return interaction.respond([]).catch(() => {});
  }
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand();
  const playlistName = interaction.options.getString('playlist');
  const playlists = (await db.get(`users.${interaction.user.id}.playlists`)) || [];
  let page = interaction.options.getInteger('page');

  switch (subcommand) {
    case 'delete': {
      if (!playlistName) {
        return interaction.client.util.errorEmbed(interaction, 'Please specify the name of the playlist to delete.');
      }

      const userPlaylists = (await db.get(`users.${interaction.user.id}.playlists`)) || [];

      if (!userPlaylists || userPlaylists.length === 0) {
        return interaction.client.util.errorEmbed(interaction, "You don't currently have any saved playlists.");
      }

      // Find the playlist by name
      const playlistIndex = userPlaylists.findIndex((p) => p.name.toLowerCase() === playlistName.toLowerCase());

      if (playlistIndex === -1) {
        return interaction.client.util.errorEmbed(interaction, `No playlist found with the name \`${playlistName}\`.`);
      }

      // Remove the playlist
      userPlaylists.splice(playlistIndex, 1);

      // Save the updated playlist array
      await db.set(`users.${interaction.user.id}.playlists`, userPlaylists);

      return interaction.editReply(`The playlist \`${playlistName}\` has been deleted.`);
    }

    case 'list': {
      if (!playlists || playlists.length === 0) {
        return interaction.client.util.errorEmbed(interaction, "You don't currently have any saved playlists.");
      }

      const itemsPerPage = 10;
      const maxPages = Math.ceil(playlists.length / itemsPerPage);

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedPlaylists = playlists.slice(start, end);

      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle('Your Playlists')
        .setDescription(
          paginatedPlaylists
            .map(
              (playlist, index) =>
                `**${start + index + 1}.** ${playlist.name}\n` +
                `*Created on:* ${new Date(playlist.createdAt).toLocaleDateString()} | *Tracks:* ${
                  playlist.tracks.length
                }`,
            )
            .join('\n\n'),
        )
        .setFooter({ text: `Page ${page}/${maxPages}` })
        .setColor(interaction.settings.embedColor);

      return interaction.editReply({ embeds: [embed] });
    }

    case 'load': {
      const currentPlaylists = (await db.get(`users.${interaction.user.id}.playlists`)) || [];

      // Find the playlist by name
      const userPlaylist = currentPlaylists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());

      if (!userPlaylist) {
        return interaction.client.util.errorEmbed(interaction, `You don't have a playlist named \`${playlistName}\`.`);
      }

      try {
        let player = interaction.client.lavalink.getPlayer(interaction.guild.id);

        if (!player) {
          player = interaction.client.lavalink.createPlayer({
            guildId: interaction.guild.id,
            voiceChannelId: interaction.member.voice.channel.id,
            textChannelId: interaction.channel.id,
            selfDeaf: true,
            selfMute: false,
          });

          await player.connect();
        }

        player.queue.add(userPlaylist.tracks);

        if (!player.playing && !player.paused) {
          await player.play();
        }

        return interaction.editReply(`Your playlist \`${playlistName}\` has been loaded!`);
      } catch (error) {
        console.error('Load Playlist Error:', error);
        return interaction.editReply('An error occurred while loading the queue.');
      }
    }

    case 'save': {
      const player = interaction.client.lavalink.getPlayer(interaction.guild.id);

      if (!player || player.queue.tracks.length < 1) {
        return interaction.client.util.errorEmbed(
          interaction,
          'There are no tracks in the queue to save to a playlist.',
        );
      }

      const currentPlaylists = (await db.get(`users.${interaction.user.id}.playlists`)) || [];

      if (currentPlaylists.some((p) => p.name === playlistName)) {
        return interaction.client.util.errorEmbed(
          interaction,
          `You already have a playlist named \`${playlistName}\`.`,
        );
      }

      if (currentPlaylists.length >= 20) {
        return interaction.client.util.errorEmbed(
          interaction,
          'You have reached the maximum number of playlists allowed (20).',
        );
      }

      const queue = await player.queue.QueueSaver.get(interaction.guild.id);

      const playlistID = uuidv4();

      const newPlaylist = {
        id: playlistID,
        name: playlistName,
        createdAt: new Date().toISOString(),
        tracks: queue.tracks,
      };

      try {
        await db.push(`users.${interaction.user.id}.playlists`, newPlaylist);
        return interaction.editReply(
          `I have successfully created the playlist \`${playlistName}\` with ${
            queue.tracks.length
          } tracks. You can play it using the \`/playlist load\` command. (${currentPlaylists.length + 1}/50)`,
        );
      } catch (error) {
        console.error(error);
        return interaction.editReply('An error occurred while saving your playlist.');
      }
    }
  }
};
