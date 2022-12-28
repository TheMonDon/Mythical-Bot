const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const moment = require('moment');

class Github extends Command {
  constructor (client) {
    super(client, {
      name: 'github',
      description: 'View information about a repository on Github',
      usage: 'Github <user> <repository> \nGithub <user/repository>',
      category: 'Search',
      aliases: ['gh']
    });
  }

  async run (msg, args) {
    let author;
    let repository;

    if (!args || args.length < 2) {
      // If there is only one argument, it could be in the format of user/repository
      if (args.length === 1) {
        args = args.join('');
        args = args.split('/');
        if (args.length === 2) {
          author = args[0];
          repository = args[1];
        } else {
          return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Github <user> <repository> OR Github <user/repository>`);
        }
      } else {
        return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Github <user> <repository> OR Github <user/repository>`);
      }
    }

    author = args[0];
    repository = args[1];

    try {
      const { body } = await fetch
        .get(`https://api.github.com/repos/${author}/${repository}`)
        .set({ Authorization: `token ${this.client.config.github}` });

      const embed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setAuthor({ name: 'GitHub', iconURL: 'https://i.imgur.com/e4HunUm.png', url: 'https://github.com/' })
        .setTitle(body.full_name)
        .setURL(body.html_url)
        .setDescription(body.description ? body.description.slice(0, 2000) : 'No description.')
        .setThumbnail(body.owner.avatar_url)
        .addFields([
          { name: 'Stars', value: body.stargazers_count.toLocaleString(), inline: true },
          { name: 'Forks', value: body.forks.toLocaleString(), inline: true },
          { name: 'Issues', value: body.open_issues.toLocaleString(), inline: true },
          { name: 'Language', value: body.language || 'Unknown', inline: true },
          { name: 'License', value: body.license ? body.license.name : 'None', inline: true },
          { name: 'Archived', value: body.archived ? 'Yes' : 'No', inline: true },
          { name: 'Size', value: `${(body.size / 1000).toLocaleString()} MB`, inline: true },
          { name: 'Creation Date', value: moment.utc(body.created_at).format('MM/DD/YYYY h:mm A'), inline: true },
          { name: 'Modification Date', value: moment.utc(body.updated_at).format('MM/DD/YYYY h:mm A'), inline: true }
        ]);

      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      if (err.status === 404) return msg.channel.send('No results were found for that repository.');
      return msg.channel.send(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
    }
  }
}
module.exports = Github;
