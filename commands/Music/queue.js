const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');

class Queue extends Command {
  constructor (client) {
    super(client, {
      name: 'queue',
      description: 'Shows what is in the queue',
      category: 'Music',
      usage: 'queue',
      aliases: ['q'],
      guildOnly: true
    });
  }

  async run (msg) {
    const client = this.client;
    const queue = client.player.getQueue(msg);
    if (!queue || queue.tracks.length < 1) return msg.channel.send('There are no more songs in the queue.');

    let q = queue.tracks.map((tracks, i) => {
      return `${i+1}- ${tracks.title} : ${tracks.author}`;
    }).join('\n');
    q = q.slice(0, 1990) + '...';
    const em = new MessageEmbed()
      .setTitle('Queue List')
      .setDescription(`\`\`\`${q}\`\`\``)
      .addField('Queue Length:', queue.tracks.length, false);
    msg.channel.send(em);
  }
}

module.exports = Queue;
