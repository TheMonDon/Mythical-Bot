/* eslint-disable prefer-regex-literals */
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const { JSONPath } = require('jsonpath-plus');

class MinecraftAccount extends Command {
  constructor (client) {
    super(client, {
      name: 'mc-account',
      description: 'Find information about a Minecraft account.',
      usage: 'mc-account <username>',
      category: 'Minecraft',
      aliases: ['mca', 'mcaccount']
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Username')
        .setColor('FF0000')
        .setDescription(`Invalid Usage: ${msg.settings.prefix}mc-account <username>`);
      return msg.channel.send({ embeds: [embed] });
    }
    const name = args.join(' ').trim();

    const nameRegex = new RegExp(/^\w{3,16}$/);
    // Make sure the username is a valid MC username
    if (!nameRegex.test(name)) {
      const em = new EmbedBuilder()
        .setTitle('Invalid Username')
        .setColor('FF0000')
        .setDescription(`\`${name}\` is not a valid minecraft username.`);
      return msg.channel.send({ embeds: [em] });
    }

    try {
      const body = await fetch.get(`https://api.mojang.com/users/profiles/minecraft/${name}`);
      const id = body.body.id;
      const rn = body.body.name;

      try {
        const { body } = await fetch.get(`https://api.mojang.com/user/profiles/${id}/names`);
        const json = body;
        const nc = JSONPath({ path: '*.name', json }).join(', ');
        const em = new EmbedBuilder()
          .setTitle(`${rn}'s Account Information`)
          .setColor('00FF00')
          .setImage(`https://mc-heads.net/body/${id}`)
          .addFields([
            { name: 'Name Changes History', value: nc || 'Error fetching data...', inLine: false },
            { name: 'UUID', value: id.toString(), inLine: false },
            { name: 'NameMC Link', value: `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, inLine: false }
          ]);
        return msg.channel.send({ embeds: [em] });
      } catch (err) {
        return console.error(err);
      }
    } catch (err) {
      const em = new EmbedBuilder()
        .setTitle('Account Not Found')
        .setColor('FF0000')
        .setDescription(`An account with the name \`${name}\` was not found.`);
      return msg.channel.send({ embeds: [em] });
    }
  }
}

module.exports = MinecraftAccount;
