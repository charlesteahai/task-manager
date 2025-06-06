import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const inviteUserToBoard = functions.https.onCall(async (data, context) => {
    // 1. Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "You must be logged in to invite users."
        );
    }

    const { email, boardId } = data;
    const uid = context.auth.uid;

    if (!email || !boardId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Please provide an email and board ID."
        );
    }

    try {
        // 2. Verify the caller is the board owner
        const boardRef = db.collection("boards").doc(boardId);
        const boardDoc = await boardRef.get();

        if (!boardDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Board not found.");
        }

        const boardData = boardDoc.data();
        if (!boardData || boardData.owner !== uid) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "You must be the board owner to invite users."
            );
        }

        // 3. Look up the user to invite by email
        let invitedUser;
        try {
            invitedUser = await admin.auth().getUserByEmail(email);
        } catch (error) {
            throw new functions.https.HttpsError(
                "not-found",
                "No user found with this email address."
            );
        }
        
        const invitedUid = invitedUser.uid;

        // 4. Check if the user is already a member
        if (boardData.members && boardData.members.includes(invitedUid)) {
            throw new functions.https.HttpsError(
                "already-exists",
                "This user is already a member of the board."
            );
        }
        
        // 5. Add the user to the board's members array
        await boardRef.update({
            members: admin.firestore.FieldValue.arrayUnion(invitedUid),
        });

        return {
            success: true,
            message: `Successfully invited ${email} to the board.`,
        };

    } catch (error) {
        // We rethrow HttpsError to send a specific error to the client
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // For other errors, log them and throw a generic error
        console.error("Error inviting user to board:", error);
        throw new functions.https.HttpsError(
            "internal",
            "An unexpected error occurred. Please try again."
        );
    }
});

export const removeUserFromBoard = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }

    const { boardId, memberUid } = data;
    const callerUid = context.auth.uid;

    if (!boardId || !memberUid) {
        throw new functions.https.HttpsError("invalid-argument", "Board ID and member UID are required.");
    }

    try {
        const boardRef = db.collection("boards").doc(boardId);
        const boardDoc = await boardRef.get();

        if (!boardDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Board not found.");
        }

        const boardData = boardDoc.data();
        if (!boardData || boardData.owner !== callerUid) {
            throw new functions.https.HttpsError("permission-denied", "Only the board owner can remove members.");
        }
        
        if (boardData.owner === memberUid) {
            throw new functions.https.HttpsError("invalid-argument", "The board owner cannot be removed.");
        }

        await boardRef.update({
            members: admin.firestore.FieldValue.arrayRemove(memberUid),
        });

        return { success: true, message: "Member removed successfully." };

    } catch (error) {
        console.error("Error removing user from board:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred while removing the member.");
    }
}); 