const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const npm = require('search-npm-registry');
const moment = require('moment');
const { stripIndents } = require('common-tags');

class npmInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'npm-info',
      description: 'Get information about a NPM package.',
      usage: 'npm-info <package>',
      category: 'Information',
      aliases: ['ni', 'npmi']
    });
  }

  async run(msg, args) {

    if (!args) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}npm-info <package>`);

    const results = await npm().text(args.join(' ')).size(5).search();
    if (!results || results.length < 1) return msg.channel.send('I could not find a package by that name.');
    const result = results[0];

    const maintainers = [];
    for (let i = 0; i < results[0].maintainers.length; i++) {
      maintainers.push(results[0].maintainers[i].username);
    }

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(result.name, 'https://i.imgur.com/24yrZxG.png', 'https://www.npmjs.com/')
      .setColor('ORANGE')
      .setDescription(stripIndents`
    ${result.description ? result.description : null}
    :up: Version: ${result.version}
    :bust_in_silhouette: Author: ${result.publisher.username}
    :alarm_clock: Modified: ${moment(result.date).fromNow()}
    :busts_in_silhouette: Maintainers: ${maintainers.join(', ')}
    Keywords: ${result.keywords?.length > 0 ? result.keywords.map(k => `\`${k}\``).join(', ') : 'none'}
    Download: [${result.name}](${result.links.npm})
    `);
    return msg.channel.send(em);
  }
}

module.exports = npmInfo;
