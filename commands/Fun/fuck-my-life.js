const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-fetch');
const HTMLParser = require('node-html-parser');

class fml extends Command {
  constructor (client) {
    super(client, {
      name: 'fuck-my-life',
      description: 'Get a random Fuck My Life story from fmylife.com.',
      usage: 'fuck-my-life',
      category: 'Fun',
      aliases: ['fml', 'fuckmylife', 'fmylife']
    });
  }

  async run (msg) {
    const res = await fetch('https://www.fmylife.com/random');
    const text = await res.text();

    const root = HTMLParser.parse(text);
    const article = root.querySelector('.panel-classic .article-contents .article-link');
    const downdoot = root.querySelector('.panel-classic .article-contents .vote-button-container .vote-down-group .vote-count');
    const updoot = root.querySelector('.panel-classic .article-contents .vote-button-container .vote-group .vote-count');
    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Fuck my Life, Random Edition!')
      .setColor(165868)
      .setThumbnail('http://i.imgur.com/5cMj0fw.png')
      .setFooter(`Requested by: ${msg.author.username} | Powered By fmylife.com`)
      .setDescription(`_${article?.childNodes[0].text.replace(/&#039;/g, '\'').replace(/&quot;/g, '"')}\n\n_`)
      .addField('I agree, your life sucks', updoot?.childNodes[0].text, true)
      .addField('You deserved it:', downdoot?.childNodes[0].text, true);

    if (article?.childNodes[0].text.length < 5) return msg.channel.send("Today, something went wrong, so you'll have to try again in a few moments. FML");

    return msg.channel.send(embed);
  }
}

module.exports = fml;
