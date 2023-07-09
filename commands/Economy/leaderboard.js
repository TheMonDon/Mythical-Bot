const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class Leaderboard extends Command {
  constructor(client) {
    super(client, {
      name: 'leaderboard',
      description: 'Get the economy leaderboard',
      category: 'Economy',
      examples: ['leaderboard [page number]'],
      aliases: ['lb', 'baltop'],
      guildOnly: true,
    });
  }

  async run(msg, text) {
    let page = text.join(' ');
    page = parseInt(page, 10);
    const usage = `Incorrect Usage: ${msg.settings.prefix}Leaderboard [page number]`;
    await msg.guild.members.fetch();

    // Leaderboard made possible by: CoolGuy#9889

    if (!page) page = 1;
    if (isNaN(page)) return msg.reply(usage);

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    let realPage = page;
    let maxPages = page;
    const stuff = db.get(`servers.${msg.guild.id}.users`) || {};
    const lb = [];

    // Cache users and add them to the leaderboard
    for (const i in stuff) {
      try {
        const u = await this.client.users.cache.get(i);
        if (u) {
          lb.push({
            user: u.discriminator === '0' ? u.username : u.tag,
            money: parseFloat((stuff[i].economy.cash || 0) + (stuff[i].economy.bank || 0)),
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Sort the leaderboard
    let abc123 = lb
      .sort((a, b) => b.money - a.money)
      .map(
        (c) =>
          `**${lb.indexOf(c) + 1}.** ${c.user} - ${currencySymbol}${
            c.money.toLocaleString().length > 156
              ? `${c.money.toLocaleString().slice(0, 153) + '...'}`
              : `${c.money.toLocaleString()}`
          }`,
      );
    let temp = abc123.slice(Math.floor((page - 1) * 10), Math.ceil(page * 10));

    // Create the pages
    if (temp.length > 0) {
      realPage = page;
      maxPages = Math.ceil((abc123.length + 1) / 10);
      abc123 = abc123.slice(Math.floor((page - 1) * 10), Math.ceil(page * 10));
    } else {
      for (let i = 1; i <= page; i++) {
        temp = abc123.slice(Math.floor((i - 1) * 10), Math.ceil(i * 10));
        if (temp?.length < 1) {
          realPage = i - 1;
          maxPages = Math.ceil(abc123.length / 10);
          abc123 = abc123.slice(Math.floor((i - 1 - 1) * 10), Math.ceil((i - 1) * 10));
          break;
        }
      }
    }

    // Send the leaderboard
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Leaderboard`)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(abc123.join('\n') || 'None')
      .setFooter({ text: `Page ${realPage} / ${maxPages}` })
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Leaderboard;
