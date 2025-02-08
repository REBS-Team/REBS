module.exports = {
  data: {
    name: "react-to-message",
    description: "Reacts to a specific message by ID or link",
    "integration_types": [1],
    "contexts": [0, 1, 2],
    options: [
      {
        name: "message",
        description: "The ID or link of the message you want to react to",
        type: 3,
        required: true,
      },
    ],
    default_permission: false,
    permissions: [
      {
        id: 'VIEW_CHANNEL',
        type: 'ROLE',
        permission: true,
      },
    ],
  },
  async execute(interaction) {
    try {
      // Extract the message ID or link from the interaction
      const messageInput = interaction.options.getString("message");

      let messageId;
      if (messageInput.includes("https://")) {
        // Extract the message ID from the link
        const urlParts = messageInput.split("/");
        messageId = urlParts[urlParts.length - 1];
      } else {
        messageId = messageInput;
      }

      // Fetch the message from the API
      const message = await interaction.channel.messages.fetch(messageId);

      if (!message) {
        await interaction.reply({ content: `Message not found!`, ephemeral: true });
        return;
      }

      // React to the message with a bunch of emojis
      const emojis = ["🎉", "👍", "😊", "🤩", "💥", "🔥", "😄", "👏"];
      for (const emoji of emojis) {
        await message.react(emoji);
      }

      await interaction.reply({ content: `Reacted to message with a party!`, ephemeral: true });
    } catch (error) {
      console.error("Error reacting to message:", error);
      await interaction.reply({ content: `An error occurred while trying to react to the message.`, ephemeral: true });
    }
  },
};