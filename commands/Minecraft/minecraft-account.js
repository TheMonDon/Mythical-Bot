/* eslint-disable prefer-regex-literals */
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class MinecraftAccount extends Command {
  constructor(client) {
    super(client, {
      name: 'minecraft-account',
      description: 'View information about a Minecraft account',
      usage: 'minecraft-account <username>',
      category: 'Minecraft',
      aliases: ['mca', 'mcaccount', 'mc-account'],
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const errorColor = msg.settings.embedErrorColor;
    const successColor = msg.settings.embedSuccessColor;
    const name = args.join(' ').trim();

    const nameRegex = new RegExp(/^\w{3,16}$/);
    // Make sure the username is a valid MC username
    if (!nameRegex.test(name)) {
      const em = new EmbedBuilder()
        .setTitle('Invalid Username')
        .setColor(errorColor)
        .setDescription(`\`${name}\` is not a valid minecraft username.`);
      return msg.channel.send({ embeds: [em] });
    }

    try {
      const body = await fetch.get(`https://api.mojang.com/users/profiles/minecraft/${name}`);
      const id = body.body.id;
      const realName = body.body.name;

      const em = new EmbedBuilder()
        .setTitle(`${realName}'s Account Information`)
        .setColor(successColor)
        .setImage(`https://mc-heads.net/body/${id}`)
        .addFields([
          { name: 'UUID', value: id.toString(), inline: false },
          {
            name: 'NameMC Link',
            value: `Click [here](https://namemc.com/profile/${id}) to go to their NameMC Profile`,
            inline: false,
          },
        ]);

      return msg.channel.send({ embeds: [em] });
    } catch (err) {
      const em = new EmbedBuilder()
        .setTitle('Account Not Found')
        .setColor(errorColor)
        .setDescription(`An account with the name \`${name}\` was not found.`);
      return msg.channel.send({ embeds: [em] });
    }
  }
}

module.exports = MinecraftAccount;
