const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');
const moment = require('moment');

class github extends Command {
  constructor (client) {
    super(client, {
      name: 'github',
      description: 'View information about a repository on Github',
      usage: 'github',
      category: 'Search',
      aliases: ['gh']
    });
  }

  async run (msg, args) {
    const p = msg.settings.prefix;

    if (!args || args < 2) {
      return msg.channel.send(`Incorrect Usage: ${p}github <user> <repository>`);
    }

    const author = args[0];
    const repository = args[1];

    try {
      const { body } = await fetch
        .get(`https://api.github.com/repos/${author}/${repository}`)
        .set({ Authorization: `token ${this.client.config.github}` });
      const embed = new DiscordJS.MessageEmbed()
        .setColor('0099CC')
        .setAuthor('GitHub', 'https://i.imgur.com/e4HunUm.png', 'https://github.com/')
        .setTitle(body.full_name)
        .setURL(body.html_url)
        .setDescription(body.description ? body.description.slice(0, 2000) : 'No description.')
        .setThumbnail(body.owner.avatar_url)
        .addField('Stars', body.stargazers_count.toLocaleString(), true)
        .addField('Forks', body.forks.toLocaleString(), true)
        .addField('Issues', body.open_issues.toLocaleString(), true)
        .addField('Language', body.language || '???', true)
        .addField('Creation Date', moment.utc(body.created_at).format('MM/DD/YYYY h:mm A'), true)
        .addField('Modification Date', moment.utc(body.updated_at).format('MM/DD/YYYY h:mm A'), true);
      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      if (err.status === 404) return msg.channel.send('Could not find any results.');
      return msg.channel.send(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
    }
  }
}
module.exports = github;
