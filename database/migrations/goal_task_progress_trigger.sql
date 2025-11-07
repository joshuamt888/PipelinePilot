-- Trigger to automatically update goal progress when linked tasks are completed/uncompleted

-- Function to update goal progress based on completed tasks
CREATE OR REPLACE FUNCTION update_goal_task_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all goals linked to this task
    UPDATE goals
    SET current_value = (
        SELECT COUNT(*)
        FROM goal_tasks gt
        JOIN tasks t ON t.id = gt.task_id
        WHERE gt.goal_id = goals.id
        AND t.status = 'completed'
    ),
    updated_at = NOW()
    WHERE id IN (
        SELECT goal_id
        FROM goal_tasks
        WHERE task_id = NEW.id
    )
    AND goal_type = 'task_list';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires when task status changes
DROP TRIGGER IF EXISTS trigger_update_goal_task_progress ON tasks;
CREATE TRIGGER trigger_update_goal_task_progress
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_goal_task_progress();

-- Also update when a task is first linked to a goal (in case task is already completed)
CREATE OR REPLACE FUNCTION update_goal_on_task_link()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the goal's current_value when a new task is linked
    UPDATE goals
    SET current_value = (
        SELECT COUNT(*)
        FROM goal_tasks gt
        JOIN tasks t ON t.id = gt.task_id
        WHERE gt.goal_id = NEW.goal_id
        AND t.status = 'completed'
    ),
    updated_at = NOW()
    WHERE id = NEW.goal_id
    AND goal_type = 'task_list';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_on_task_link ON goal_tasks;
CREATE TRIGGER trigger_update_goal_on_task_link
    AFTER INSERT ON goal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_on_task_link();

-- Update when a task is unlinked from a goal
CREATE OR REPLACE FUNCTION update_goal_on_task_unlink()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the goal's current_value when a task is unlinked
    UPDATE goals
    SET current_value = (
        SELECT COUNT(*)
        FROM goal_tasks gt
        JOIN tasks t ON t.id = gt.task_id
        WHERE gt.goal_id = OLD.goal_id
        AND t.status = 'completed'
    ),
    updated_at = NOW()
    WHERE id = OLD.goal_id
    AND goal_type = 'task_list';

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_on_task_unlink ON goal_tasks;
CREATE TRIGGER trigger_update_goal_on_task_unlink
    AFTER DELETE ON goal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_on_task_unlink();
