const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class History extends Command {
  constructor (client) {
    super(client, {
      name: 'history',
      description: 'History of the queue',
      category: 'Music',
      usage: 'history [page]',
      guildOnly: true
    });
  }

  async run (msg, args) {
    let page = args.join(' ');
    page = parseInt(page, 10);
    const queue = this.client.player.getQueue(msg.guild.id);

    if (!page) page = 1;
    if (isNaN(page)) return msg.channel.send('Please input a valid number.');

    const pageEnd = (-10 * (page - 1)) - 1;
    const pageStart = (pageEnd - 10);
    const currentTrack = queue.current;
    const tracks = queue.previousTracks.slice(pageStart, pageEnd).reverse().map((m, i) => {
      return `${i + (pageEnd * -1)}. **${m.title}** ([link](${m.url}))`;
    });

    const embed = new EmbedBuilder()
      .setTitle('Server Queue History')
      .setDescription(`${tracks.join('\n')}${
        queue.previousTracks.length > (pageStart * -1)
          ? `\n...${(queue.previousTracks.length + pageStart)} more track(s)`
          : ''
      }`)
      .setColor('#0099CC')
      .addFields([{ name: 'Now Playing', value: `🎶 | **${currentTrack.title}** ([link](${currentTrack.url}))` }]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = History;
