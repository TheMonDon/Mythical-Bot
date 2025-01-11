const Command = require('../../base/Command.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

class YesNo extends Command {
  constructor(client) {
    super(client, {
      name: 'yesno',
      description: "Displays the author's and the mentioned user's avatars on a Yes/No background.",
      category: 'Images',
      usage: 'yesno <user>',
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    if (!args.length) {
      return msg.reply('Please mention a user or provide their ID!');
    }

    let infoMem; // Will store the GuildMember or User object
    let fetchedUser; // Will store the User object

    // If text is provided, try to get the member from the guild
    if (args?.length > 0) {
      infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());
    } else {
      infoMem = msg.member;
    }

    if (!infoMem) {
      // If no member is found, try to fetch the user by ID
      const findId = args.join(' ').toLowerCase().replace(/<@|>/g, '');

      try {
        // Fetch the user object using the ID
        fetchedUser = await this.client.users.fetch(findId, { force: true });
      } catch (err) {
        // If the user cannot be fetched, default to the message author
        infoMem = msg.member; // Use the message author's member object
        fetchedUser = infoMem.user; // Get the User object from the member
      }
    } else {
      // If a member is found in the guild, fetch their user object
      fetchedUser = infoMem.user;
    }

    // Fetch author and target user avatars
    const authorAvatarURL = msg.author.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });
    const targetAvatarURL = fetchedUser.displayAvatarURL({ extension: 'png', size: 512, dynamic: false });

    try {
      // Load the avatars and background
      const authorAvatar = await loadImage(authorAvatarURL);
      const targetAvatar = await loadImage(targetAvatarURL);
      const backgroundPath = path.resolve(__dirname, '../../resources/images/yesno.png');
      const background = await loadImage(backgroundPath);

      // Create a canvas with the dimensions of the background
      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');

      // Draw the background
      ctx.drawImage(background, 0, 0);

      // Resize and draw the avatars (swapped positions)
      const avatarWidth = 500;
      const avatarHeight = 500;

      // Target user's avatar (top position)
      const targetAvatarX = 870;
      const targetAvatarY = 15;
      ctx.drawImage(targetAvatar, targetAvatarX, targetAvatarY, avatarWidth, avatarHeight);

      // Author's avatar (bottom position)
      const authorAvatarX = 870;
      const authorAvatarY = 560;
      ctx.drawImage(authorAvatar, authorAvatarX, authorAvatarY, avatarWidth, avatarHeight);

      // Send the result
      const attachment = canvas.toBuffer();
      await msg.channel.send({
        files: [{ attachment, name: 'yesno_result.png' }],
      });
    } catch (error) {
      this.client.logger.error(error.stack);
      msg.reply('There was an error processing the image.');
    }
  }
}

module.exports = YesNo;
