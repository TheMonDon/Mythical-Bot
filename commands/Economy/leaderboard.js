const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class Leaderboard extends Command {
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
    const server = msg.guild;
    let page = text.join(' ');
    page = parseInt(page);

    // Leaderboard made possible by: CoolGuy#9889

    if (!page) page = 1;
    if (isNaN(page)) return msg.channel.send('Please input a valid number.');

    const cs = db.get(`servers.${server.id}.economy.symbol`) || '$';
    let realPage = page;
    let maxPages = page;
    const stuff = db.get(`servers.${server.id}.users`) || {};
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
    const embed = new DiscordJS.MessageEmbed()
      .setColor('RANDOM')
      .setTitle(`${server.name}'s Leaderboard`)
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setDescription(abc123.join('\n'))
      .setFooter(`Page ${realPage} / ${maxPages}`)
      .setTimestamp();
    return msg.channel.send(embed);
  }
};
