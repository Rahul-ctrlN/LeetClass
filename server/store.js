const supabase = require('./supabase');

async function readStudents(ownerId) {
    const { data, error } = await supabase
        .from('students')
        .select('id, owner_id, data')
        .eq('owner_id', ownerId);

    if (error) {
        throw error;
    }

    return (data || []).map(row => ({
        ...row.data,
        ownerId: row.owner_id
    }));
}

async function writeStudents(ownerId, students) {
    // Remove the old students belonging to this teacher
    const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('owner_id', ownerId);

    if (deleteError) {
        throw deleteError;
    }

    // If there are no students, we're finished
    if (!students || students.length === 0) {
        return;
    }

    // Save all current students
    const rows = students.map(student => ({
        id: student.id,
        owner_id: ownerId,
        data: student
    }));

    const { error: insertError } = await supabase
        .from('students')
        .insert(rows);

    if (insertError) {
        throw insertError;
    }
}

module.exports = {
    readStudents,
    writeStudents
};