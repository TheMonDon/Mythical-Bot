const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Kill extends Command {
  constructor(client) {
    super(client, {
      name: 'kill',
      description: 'Kill the chosen member in a funny way',
      usage: 'kill [member]',
      category: 'Fun',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    delete require.cache[require.resolve('../../resources/messages/deaths.json')];
    const deaths = require('../../resources/messages/deaths.json');
    let mem;
    let random = false;

    if (args?.length < 1) {
      mem = msg.guild.members.cache.filter((m) => m.id !== msg.author.id).random();
      random = true;
    } else {
      mem = await this.client.util.getMember(msg, args.join(' '));
      if (!mem) return msg.channel.send('Please provide a valid user.');
    }

    if (mem.id === msg.author.id) return msg.channel.send("Please don't try to kill yourself :(");

    const num = Math.round(Math.random() * (deaths.length - 1)) + 1;

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle(
        deaths[num]
          .replace('{mem.displayName}', `\`${mem.displayName}\``)
          .replace('{member.displayName}', `\`${msg.member.displayName}\``),
      )
      .setColor(msg.settings.embedColor)
      .setFooter({ text: `Reply #${num} ${random ? '| Random member chosen' : ''}` });

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Kill;
