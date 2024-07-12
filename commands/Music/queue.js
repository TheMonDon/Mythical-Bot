const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

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
    const queue = useQueue(msg.guild.id);

    if (!queue || queue.tracks.size < 1) return msg.channel.send('There are no more songs in the queue.');
    if (!page) page = 1;
    if (isNaN(page)) return msg.channel.send('Please input a valid number.');

    let realPage = page;
    let q = queue.tracks.map((track, i) => `**${i + 1}.** ${track.title} - ${track.author}`);
    console.log(queue.tracks);
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

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Queue`)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(q.join('\n'))
      .setFooter({ text: `Page ${realPage} / ${maxPages}` })
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Queue;
