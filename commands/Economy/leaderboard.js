const Command = require('../../base/Command.js');
const db = require('quick.db');
const { MessageEmbed } = require('discord.js');

class Leaderboard extends Command {
  constructor (client) {
    super(client, {
      name: 'leaderboard',
      description: 'Get the economy leaderboard',
      category: 'Economy',
      examples: ['leaderboard [page]'],
      aliases: ['lb'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    let page = text.join(' ');
    page = parseInt(page, 10);

    // Leaderboard made possible by: CoolGuy#9889

    if (!page) page = 1;
    if (isNaN(page)) return msg.channel.send('Please input a valid number.');

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    let realPage = page;
    let maxPages = page;
    const stuff = db.get(`servers.${msg.guild.id}.users`) || {};
    const lb = [];

    for (const i in stuff) {
      try {
        const u = await this.client.users.cache.get(i);
        if (u) {
          lb.push({
            user: u.tag,
            money: (stuff[i].economy.cash || 0) + (stuff[i].economy.bank || 0)
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    let abc123 = lb.sort((a, b) => b.money - a.money)
      .map((c) => `**${lb.indexOf(c) + 1}.** ${c.user} - ${cs}${(c.money.toLocaleString().length > 156) ? `${c.money.toLocaleString().slice(0, 153) + '...'}` : `${c.money.toLocaleString()}`}`);
    let temp = abc123.slice(Math.floor((page - 1) * 10), Math.ceil(page * 10));

    if (temp.length > 0) {
      realPage = page;
      maxPages = Math.ceil((abc123.length + 1) / 10);
      abc123 = abc123.slice(Math.floor((page - 1) * 10), Math.ceil(page * 10));
    } else {
      for (let i = 1; i <= page; i++) {
        temp = abc123.slice(Math.floor((i - 1) * 10), Math.ceil(i * 10));
        if (temp.length < 1) {
          realPage = i - 1;
          maxPages = Math.ceil(abc123.length / 10);
          abc123 = abc123.slice(Math.floor(((i - 1) - 1) * 10), Math.ceil((i - 1) * 10));
          break;
        }
      }
    }
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setTitle(`${msg.guild.name}'s Leaderboard`)
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setDescription(abc123.join('\n'))
      .setFooter(`Page ${realPage} / ${maxPages}`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Leaderboard;
