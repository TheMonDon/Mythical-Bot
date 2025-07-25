const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
require('moment-duration-format');
const moment = require('moment');

class Queue extends Command {
  constructor(client) {
    super(client, {
      name: 'queue',
      description: 'See what songs are in the queue',
      category: 'Music',
      usage: 'queue [page]',
      aliases: ['q'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = args.join(' ');
    page = parseInt(page, 10);
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!player || player.queue.tracks.length < 1) {
      return this.client.util.errorEmbed(msg, 'There are no songs in the queue.');
    }
    if (!page) page = 1;
    if (isNaN(page)) {
      return this.client.util.errorEmbed(msg, 'Please input a valid number.');
    }

    let realPage = page;
    let q = player.queue.tracks.map((track, i) => {
      return `**${i + 1}.** ${track.info.title} - ${track.info.author}`;
    });
    const maxPages = Math.max(Math.ceil(q.length / 25), 1); // Ensure maxPages is at least 1

    let temp = q.slice((page - 1) * 25, page * 25);

    if (temp.length > 0) {
      q = temp;
    } else {
      for (let i = 1; i <= page; i++) {
        temp = q.slice((i - 1) * 25, i * 25);
        if (temp.length < 1) {
          realPage = Math.max(i - 1, 1); // Ensure realPage is at least 1
          q = q.slice((realPage - 1) * 25, realPage * 25);
          break;
        }
      }
    }

    const totalMilliseconds = player.queue.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);

    const timeLeft = moment
      .duration(totalMilliseconds)
      .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Queue`)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription(q.join('\n'))
      .addFields([
        {
          name: 'Estimated Time Remaining',
          value: timeLeft,
          inline: false,
        },
      ])
      .setFooter({ text: `Page ${realPage} / ${maxPages}` })
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Queue;
