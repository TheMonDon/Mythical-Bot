const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const request = require('request'); // request is depreciated i will find something else later
const fetch = require('node-superfetch');
const {JSONPath} = require('jsonpath-plus');

class mcAccount extends Command {
  constructor (client) {
    super(client, {
      name: 'mcaccount',
      description: 'Find information about a minecraft account',
      usage: 'mcaccount',
      category: 'Fun',
      aliases: ['mca']
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    if (!args || args.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('FF0000')
        .addField('Error:', 'Please enter a valid minecraft username.');
      return msg.channel.send(embed);
    }
    const name = args.join(' ').trim();

    request({
      url: `https://api.mojang.com/users/profiles/minecraft/${name}`,
      json: true
    }, async function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const id = body.id;
        const rn = body.name;
        try {
          const { body } = await fetch.get(`https://api.mojang.com/user/profiles/${id}/names`);
          const json = body;
          const nc = JSONPath({path: '*.name', json}).join(', ');
          const em = new DiscordJS.MessageEmbed()
            .setTitle(`${rn}'s Account Information`)
            .setColor('00FF00')
            .setImage(`https://mc-heads.net/body/${id}`)
            .addField('Name Chanmges History', nc || 'Error fetching data...', false)
            .addField('UUID', id, false)
            .addField('NameMC Link', `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, false);
          msg.channel.send(em);
    
        } catch (err) {
          console.error(err);
        }
      } else {
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Account Not Found')
          .setColor('FF0000')
          .setDescription(`An account with the name \`${name}\` was not found.`);
        return msg.channel.send(em);
      }
    });
  }
}

module.exports = mcAccount;
