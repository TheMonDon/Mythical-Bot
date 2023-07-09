const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

class Queue extends Command {
  constructor(client) {
    super(client, {
      name: 'queue',
      description: 'Shows what is in the queue',
      category: 'Music',
      usage: 'queue [page]',
      aliases: ['q'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = args.join(' ');
    page = parseInt(page, 10);
    const queue = useQueue(msg.guild.id);

    if (!queue || queue.tracks.size < 1) return msg.channel.send('There are no more songs in the queue.');
    if (!page) page = 1;
    if (isNaN(page)) return msg.channel.send('Please input a valid number.');

    let realPage = page;
    let maxPages = page;
    let q = queue.tracks.map((track, i) => {
      return `${i + 1}. ${track.title} : ${track.author}`;
    });
    let temp = q.slice(Math.floor((page - 1) * 25), Math.ceil(page * 25));

    if (temp.length > 0) {
      realPage = page;
      maxPages = Math.ceil((q.length + 1) / 25);
      q = temp;
    } else {
      for (let i = 1; i <= page; i++) {
        temp = q.slice(Math.floor((i - 1) * 25), Math.ceil(i * 25));
        if (temp.length < 1) {
          realPage = i - 1;
          maxPages = Math.ceil(q.length / 25);
          q = q.slice(Math.floor((i - 1 - 1) * 25), Math.ceil((i - 1) * 25));
          break;
        }
      }
    }

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Queue`)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(q.join('\n'))
      .setFooter({ text: `Page ${realPage} / ${maxPages}` })
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Queue;
