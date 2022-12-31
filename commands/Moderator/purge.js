/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');
const { getMember, wait } = require('../../util/Util.js');

class Purge extends Command {
  constructor (client) {
    super(client, {
      name: 'purge',
      description: 'Purge messages in a channel optionally from a member.',
      longDescription: 'Purge <count> [@member] \nPurge links <count> \nPurge invites <count> \n\nPurge will purge up to the last 1000 messages in the channel. \nPurge links will purge up to the last 100 messages in the channel that contain links. \nPurge invites will purge up to the last 100 messages in the channel that contain invites. \n\nPurge can also be used to purge messages from a specific member. \n\n**Examples:** \n`Purge 150` \n`Purge 50 @member` \n`Purge links 50` \n`Purge invites 50` \n`Purge match ? 50` \n`Purge not ? 50` \n`Purge startswith ? 50` \n`Purge endswith ? 50` \n`Purge bots 50` \n`Purge human 50` \n`Purge images 50` \n`Purge mentions 50`',
      usage: 'Purge <count> [@member]',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Purge <2-100> [@member]`;
    const types = ['default', 'links', 'invites', 'match', 'not', 'startswith', 'endswith', 'bots', 'humans', 'images', 'mentions'];
    const linkRegex = /https?:\/\/[\w\d-_]/gi;
    const inviteRegex = /discord.(gg|me)\s?\//gi;
    let type = 'default';
    let count;

    if (!msg.guild.members.me.permissions.has('ManageMessages')) return msg.channel.send('The bot needs `Manage_Messages` permission to use this.');
    if (!args || args.length < 1) return msg.reply(usage);

    // Global function to get messages
    // channel: Channel object
    // limit: Number of messages to fetch
    // filter: Function to filter messages
    async function getMessages (channel, limit, filter, before, after) {
      return await channel.messages.fetch({
        limit,
        before,
        after
      }).then(messages => {
        if (filter) messages = messages.filter(filter);
        return messages;
      });
    }

    // Global function to delete messages
    // msg: Message object
    // messages: Collection of messages to delete
    async function deleteMessages (channel, messages) {
      if (!messages || messages.size < 1) return msg.channel.send('No messages found.');

      return await channel.bulkDelete(messages, true)
        .then(async messages => {
          return messages.size;
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    // Check if args[0] is a number
    if (parseInt(args[0], 10)) {
      count = parseInt(args[0], 10);
    } else if (types.includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    } else {
      return msg.reply(usage);
    }

    await msg.delete();

    if (type === 'default') {
      let total = Number(count);
      let purged = 0;
      let progress = count > 100;
      let user = args[1] ? getMember(msg, args.slice(1).join(' ')) : null;

      if (count > 1000) {
        count = 1000;
        total = Number(count);
      }

      if (isNaN(count)) return msg.channel.send(`\`${count}\` is not a valid number, please input another number.`);

      if (user) {
        count = count > 100 ? 100 : count;

        const filter = function (element) { return element.author === user || element.member === user; };
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found from that member.');

        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages from ${user.user.tag}.`);
      }

      if (count < 100) {
        const filter = function (element) { return !element.pinned; };
        const messages = await getMessages(msg.channel, count, filter);
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages in current channel.`);
      }

      const purgeText = progress ? 'Purging messages... 0%' : 'Purging messages...';
      const purgeMsg = await msg.channel.send(purgeText);

      while (count > 0) {
        let messages = [];

        try {
          messages = await getMessages(msg.channel, Math.min(count, 100), m => !m.pinned, msg.id);
        } catch (e) {
          return this.error('Unable to get messages.');
        }

        await deleteMessages(msg.channel, messages);

        purged += messages.size;

        if (progress) purgeMsg.edit(`Purging messages... ${Math.ceil(purged / total * 100)}%`).catch(() => false);

        if (!messages.size) count = 0;

        await wait(1100);
        count -= Math.min(count, 100);
      }

      purgeMsg.edit(`Purged ${purged} messages.`).catch(() => false);
      setTimeout(() => purgeMsg.delete().catch(() => false), 9000);
    }

    if (type === 'links') {
      const count = args[1] || 100;
      const filter = function (element) { return element.content.match(linkRegex); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found containing links.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages containing links.`);
    }

    if (type === 'invites') {
      const count = args[1] || 100;
      const filter = function (element) { return element.content.match(inviteRegex); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found containing invites.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages containing invites.`);
    }

    if (type === 'match') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (content.includes(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found containing \`${match}\`.`);

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages containing \`${match}\`.`);
    }

    if (type === 'not') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (!content.includes(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found not containing \`${match}\`.`);

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages not containing \`${match}\`.`);
    }

    if (type === 'startswith') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (content.startsWith(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found starting with \`${match}\`.`);

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages starting with \`${match}\`.`);
    }

    if (type === 'endswith') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (content.endsWith(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found ending with \`${match}\`.`);

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages ending with \`${match}\`.`);
    }

    if (type === 'bots') {
      const count = args[1] || 100;
      const filter = function (element) { return element.author.bot; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found from bots.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages from bots.`);
    }

    if (type === 'human') {
      const count = args[1] || 100;
      const filter = function (element) { return !element.author.bot; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found from humans.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages from humans.`);
    }

    if (type === 'images') {
      const count = args[1] || 100;
      const filter = function (element) { return (element.attachments?.size) || (element.embeds?.size); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found with images.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages with images.`);
    }

    if (type === 'mentions') {
      const count = args[1] || 100;
      const filter = function (element) { return element.mentions.members.size || element.mentions.roles.size; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found with mentions.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages with mentions.`);
    }

    if (type === 'before') {
      const message = await msg.channel.messages.fetch(args[1]);
      const count = args[2] || 100;
      const filter = function (element) { return element.createdTimestamp < message.createdTimestamp; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found before this message.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages before this message.`);
    }
  }
}

module.exports = Purge;
