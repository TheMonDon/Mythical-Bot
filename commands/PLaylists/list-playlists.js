const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class ListPlaylists extends Command {
  constructor(client) {
    super(client, {
      name: 'list-playlists',
      description: 'Lists your saved playlists',
      category: 'Playlists',
      usage: 'list-playlists [page]',
      aliases: ['listplaylists'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = parseInt(args[0]) || 1;

    const playlists = (await db.get(`users.${msg.author.id}.playlists`)) || [];

    if (!playlists || playlists.length === 0) {
      return msg.channel.send("You don't currently have any saved playlists.");
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
      .setColor(msg.settings.embedColor);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ListPlaylists;
