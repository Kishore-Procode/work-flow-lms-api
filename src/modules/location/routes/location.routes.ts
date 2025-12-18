/**
 * Location Routes
 * 
 * Defines routes for location hierarchy management (States, Districts, Pincodes)
 * following MNC enterprise standards for geographical data APIs.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { locationController } from '../controllers/location.controller';
import { validateBody } from '../../../middleware/validation';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas
 */
const validateAddressSchema = Joi.object({
  stateId: Joi.string().uuid().required().messages({
    'any.required': 'State ID is required',
    'string.guid': 'State ID must be a valid UUID',
  }),
  districtId: Joi.string().uuid().required().messages({
    'any.required': 'District ID is required',
    'string.guid': 'District ID must be a valid UUID',
  }),
  pincodeId: Joi.string().uuid().required().messages({
    'any.required': 'Pincode ID is required',
    'string.guid': 'Pincode ID must be a valid UUID',
  }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     State:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique state identifier
 *         name:
 *           type: string
 *           description: State name
 *           example: "Tamil Nadu"
 *         code:
 *           type: string
 *           description: State code
 *           example: "TN"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *     
 *     District:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique district identifier
 *         name:
 *           type: string
 *           description: District name
 *           example: "Chennai"
 *         stateId:
 *           type: string
 *           format: uuid
 *           description: Parent state ID
 *         stateName:
 *           type: string
 *           description: Parent state name
 *           example: "Tamil Nadu"
 *         stateCode:
 *           type: string
 *           description: Parent state code
 *           example: "TN"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *     
 *     Pincode:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique pincode identifier
 *         code:
 *           type: string
 *           description: Postal code
 *           example: "600001"
 *         areaName:
 *           type: string
 *           description: Area name
 *           example: "Fort St. George"
 *         districtId:
 *           type: string
 *           format: uuid
 *           description: Parent district ID
 *         districtName:
 *           type: string
 *           description: Parent district name
 *           example: "Chennai"
 *         stateName:
 *           type: string
 *           description: Parent state name
 *           example: "Tamil Nadu"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 */

/**
 * @swagger
 * /api/v1/locations/states:
 *   get:
 *     summary: Get all states
 *     description: Retrieve all available states in the system
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: States retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/State'
 *                 message:
 *                   type: string
 *                   example: "States retrieved successfully"
 */
router.get('/states', locationController.getAllStates);

/**
 * @swagger
 * /api/v1/locations/states/{stateId}:
 *   get:
 *     summary: Get state by ID
 *     description: Retrieve a specific state by its ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: State ID
 *     responses:
 *       200:
 *         description: State retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/State'
 *                 message:
 *                   type: string
 *                   example: "State retrieved successfully"
 *       404:
 *         description: State not found
 */
router.get('/states/:stateId', locationController.getStateById);

/**
 * @swagger
 * /api/v1/locations/states/{stateId}/districts:
 *   get:
 *     summary: Get districts by state
 *     description: Retrieve all districts within a specific state
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: State ID
 *     responses:
 *       200:
 *         description: Districts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/District'
 *                 message:
 *                   type: string
 *                   example: "Districts retrieved successfully"
 */
router.get('/states/:stateId/districts', locationController.getDistrictsByState);

/**
 * @swagger
 * /api/v1/locations/districts/{districtId}:
 *   get:
 *     summary: Get district by ID
 *     description: Retrieve a specific district by its ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: districtId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: District ID
 *     responses:
 *       200:
 *         description: District retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/District'
 *                 message:
 *                   type: string
 *                   example: "District retrieved successfully"
 *       404:
 *         description: District not found
 */
router.get('/districts/:districtId', locationController.getDistrictById);

/**
 * @swagger
 * /api/v1/locations/districts/{districtId}/pincodes:
 *   get:
 *     summary: Get pincodes by district
 *     description: Retrieve all pincodes within a specific district
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: districtId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: District ID
 *     responses:
 *       200:
 *         description: Pincodes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pincode'
 *                 message:
 *                   type: string
 *                   example: "Pincodes retrieved successfully"
 */
router.get('/districts/:districtId/pincodes', locationController.getPincodesByDistrict);

/**
 * @swagger
 * /api/v1/locations/pincodes/{pincodeId}:
 *   get:
 *     summary: Get pincode by ID
 *     description: Retrieve a specific pincode by its ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: pincodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pincode ID
 *     responses:
 *       200:
 *         description: Pincode retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Pincode'
 *                 message:
 *                   type: string
 *                   example: "Pincode retrieved successfully"
 *       404:
 *         description: Pincode not found
 */
router.get('/pincodes/:pincodeId', locationController.getPincodeById);

/**
 * @swagger
 * /api/v1/locations/search:
 *   get:
 *     summary: Search locations
 *     description: Search for states, districts, or pincodes by name or code
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [state, district, pincode]
 *         description: Filter by location type
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     states:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/State'
 *                     districts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/District'
 *                     pincodes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Pincode'
 *                 message:
 *                   type: string
 *                   example: "Search completed successfully"
 */
router.get('/search', locationController.searchLocations);

/**
 * @swagger
 * /api/v1/locations/validate:
 *   post:
 *     summary: Validate address hierarchy
 *     description: Validate that state, district, and pincode form a valid hierarchy
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stateId:
 *                 type: string
 *                 format: uuid
 *                 description: State ID
 *               districtId:
 *                 type: string
 *                 format: uuid
 *                 description: District ID
 *               pincodeId:
 *                 type: string
 *                 format: uuid
 *                 description: Pincode ID
 *             required:
 *               - stateId
 *               - districtId
 *               - pincodeId
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       description: Whether the hierarchy is valid
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of validation errors
 *                 message:
 *                   type: string
 *                   example: "Address hierarchy is valid"
 */
router.post('/validate', validateBody(validateAddressSchema), locationController.validateAddressHierarchy);

export default router;
