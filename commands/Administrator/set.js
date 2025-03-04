// This command is to modify/edit guild configuration. Perm Level 3 for admins
// and owners only. Used for changing prefixes and role names and such.

// Note the **destructuring** here. instead of `args` we have :
// [action, key, ...value]
// This gives us the equivalent of either:
// const action = args[0]; const key = args[1]; const value = args.slice(2);
// OR the same as:
// const [action, key, ...value] = args;
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Set extends Command {
  constructor(client) {
    super(client, {
      name: 'set',
      description: 'View or change the settings for your guild',
      longDescription: 'Example: `-set edit welcomeEnabled true` will enable the welcome message.',
      category: 'Administrator',
      permLevel: 'Administrator',
      usage: 'set <view/get/edit/del> <key> <value>',
      aliases: ['setting', 'settings'],
      guildOnly: true,
    });
  }

  async run(message, [action, key, ...value]) {
    // First we need to retrieve current guild settings
    const settings = message.settings;
    const defaults = this.client.settings.get('default');
    const overrides = this.client.settings.get(message.guild.id);
    if (!this.client.settings.has(message.guild.id)) this.client.settings.set(message.guild.id, {});

    // Secondly, if a user does `-set edit <key> <new value>`, let's change it
    if (action === 'edit') {
      // User must specify a key.
      if (!key) return message.reply('Please specify a key to edit');
      // User must specify a key that actually exists!
      if (!settings[key]) return message.reply('This key does not exist in the settings');
      // User must specify a value to change.
      const joinedValue = value.join(' ');
      if (joinedValue.length < 1) return message.reply('Please specify a new value');
      // User must specify a different value than the current one.
      if (joinedValue === settings[key]) return message.reply('This setting already has that value!');

      // If the guild does not have any overrides, initialize it.
      if (!this.client.settings.has(message.guild.id)) this.client.settings.set(message.guild.id, {});

      // Modify the guild overrides directly.
      this.client.settings.set(message.guild.id, joinedValue, key);
      message.reply(`${key} successfully edited to ${joinedValue}`);
    }

    // If a user does `-set del <key>`, let's ask the user if they're sure...
    else if (action === 'del' || action === 'reset') {
      if (!key) return message.reply('Please specify a key to delete (reset).');
      if (!settings[key]) return message.reply('This key does not exist in the settings');
      if (!overrides[key]) return message.reply('This key does not have an override and is already using defaults.');

      // Throw the 'are you sure?' text at them.
      const response = await this.client.util.awaitReply(
        message,
        `Are you sure you want to reset \`${key}\` to the default \`${defaults[key]}\`?`,
      );

      // If they respond with yes, continue.
      if (this.client.util.yes.includes(response)) {
        // We reset the `key` here.
        this.client.settings.delete(message.guild.id, key);
        return message.reply(`${key} was successfully reset to default.`);
      }

      // If they respond with no, we inform them that the action has been cancelled.
      else if (this.client.util.no.includes(response)) {
        return message.reply(`Your setting for \`${key}\` remains at \`${settings[key]}\``);
      }
    }

    // Using `-set get <key>` we simply return the current value for the guild.
    else if (action === 'get') {
      if (!key) return message.reply('Please specify a key to view');
      if (!settings[key]) return message.reply('This key does not exist in the settings');
      message.reply(`The value of ${key} is currently ${settings[key]}`);
    } else {
      // Otherwise, the default action is to return the whole configuration;
      const array = Object.entries(settings).map(([key, value]) => `${key}${' '.repeat(20 - key.length)}::  ${value}`);
      const embed = new EmbedBuilder()
        .setTitle('Current Guild Setting')
        .setDescription(`\`\`\`asciidoc\n${array.join('\n')}\`\`\``)
        .addFields([
          {
            name: 'Bot Panel',
            value: 'You can also use the new bot panel here: https://botpanel.xyz/dashboard/Mythical',
            inline: true,
          },
        ])
        .setFooter({ text: `For help use \`${message.settings.prefix}help set\`` });
      return message.channel.send({ embeds: [embed] });
    }
  }
}

module.exports = Set;
